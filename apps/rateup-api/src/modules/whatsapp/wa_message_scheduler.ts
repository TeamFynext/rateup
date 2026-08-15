import dayjs from "dayjs";
import prisma from "../../utils/prisma.js";
import { WaSendMessageBody } from "../../types/whatsapp.types.js";
import {
  CampaignParticipantStatus,
  SubscriptionFeaturePathName,
  waMessageScheduleSource,
  WaMessageScheduleStatus,
} from "../../types/enums.js";
import { log } from "../../utils/logger.js";
import { sendMessage } from "./whatsappSurvey/wasurvey.service.js";
import { getScheduleTime } from "../../utils/date.js";
import { updateMonthlyStat } from "../stats/stats.service.js";
import { enqueueCampaignMessage } from "../campaign/campaign.service.js";
import { getFlowIdFromTemplateComponents } from "./messageTemplates/wa_templates.utils.js";
import { getFlowWithSurveyTeamMapIds } from "./flows/flow.service.js";
import type { sendPaymentInitTemplate } from "./automatedReply/wa_automatedReply.utils.js";

interface WaMessageScheduleProps {
  phone: string;
  // sendPaymentInitTemplate() builds a payment order-details message with a shape
  // WaSendMessageBody doesn't model (its interactive.action type is flow-specific) —
  // this is stored as opaque JSON below, so both real shapes are accepted here.
  messageBody: WaSendMessageBody | Awaited<ReturnType<typeof sendPaymentInitTemplate>>;
  orgId: string;
  waTemplateId?: string;
  surveyTeamMapId?: string;
  timeDelay: number;
  source: waMessageScheduleSource;
  teamId?: string;
}

export async function createWaMessageSchedule({
  phone,
  messageBody,
  orgId,
  waTemplateId,
  surveyTeamMapId,
  timeDelay,
  source,
  teamId,
}: WaMessageScheduleProps) {
  const teamID = teamId && teamId.trim() !== "" ? teamId : null;
  const res = await prisma.waMessageSchedule.create({
    data: {
      phone,
      scheduledAt: getScheduleTime(timeDelay, new Date()),
      orgId,
      waTemplateId,
      messageBody,
      surveyTeamMapId,
      source,
      teamId: teamID,
    },
  });
  return res;
}

export async function sendSchedulesWaMessages() {
  try {
    const currentTime = new Date();
    const fiveMinutesLater = new Date(currentTime.getTime() + 5 * 60000);

    const schedules = await prisma.waMessageSchedule.findMany({
      where: {
        status: WaMessageScheduleStatus.SCHEDULED,
        scheduledAt: {
          lte: fiveMinutesLater,
        },
      },
      include: {
        waTemplate: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        surveyTeamMap: {
          select: {
            survey: {
              select: {
                languages: true,
              },
            },
          },
        },
      },
    });
    if (!schedules.length) {
      log.trace("No schedules found");
      return;
    }

    await Promise.all(
      schedules.map(async (schedule) => {
        if (!schedule.waTemplate) {
          log.error("Schedule %s has no linked waTemplate, skipping", schedule.id);
          return;
        }
        const templateComponents = schedule.waTemplate.data.components ?? [];
        const containsFlowButton = !!getFlowIdFromTemplateComponents(templateComponents);
        if (containsFlowButton) {
          const flowId = getFlowIdFromTemplateComponents(templateComponents);
          if (!flowId) {
            log.error("Flow id not found in template\n Template => %o", schedule.waTemplate.data);
            throw new Error("Flow id not found in template");
          }
          const dbFlow = await getFlowWithSurveyTeamMapIds(schedule.orgId, flowId);
          if (!dbFlow) {
            log.error("Flow not found in db with id %s", flowId);
            throw new Error("Flow not found in db");
          }
          if (!schedule.surveyTeamMapId) {
            throw new Error("surveyTeamMapId not found");
          }
        }
        const externalApi = schedule.source === waMessageScheduleSource.ExternalApi;
        const res = await sendMessage(
          schedule.orgId,
          schedule.messageBody as WaSendMessageBody,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          schedule.teamId ?? null,
          "TEMPLATE",
          false,
          externalApi,
        );
        await prisma.waMessageSchedule.update({
          where: {
            id: schedule.id,
          },
          data: {
            status: res.status ? WaMessageScheduleStatus.SENT : WaMessageScheduleStatus.FAILED,
            messageId: res.status ? res.message : undefined,
          },
        });
        await updateMonthlyStat(
          schedule.waTemplateId
            ? SubscriptionFeaturePathName.Whatsapp
            : SubscriptionFeaturePathName.Whatsapp,
          schedule.orgId,
        );
      }),
    );
  } catch (e) {
    log.error({ err: e }, "error in wamessageschedule");
  }
}

// Cron job entry point
export async function processDripCampaigns() {
  // Fetch all drip stages with pending participant drip stages for active campaigns
  const results = await prisma.$queryRawUnsafe<
    {
      dripStageId: string;
      delay: number;
      delayUnit: string;
      sendAtTime: string | null;
      participantCreatedAt: Date;
      campaignStartedAt: Date;
      campaignId: string;
      dailySendLimit: number | null;
    }[]
  >(`
  SELECT DISTINCT ON (cds.id, p."campaignId")
    cds.id AS "dripStageId",
    cds.delay,
    cds."delayUnit",
    cds."sendAtTime",
    p."createdAt" AS "participantCreatedAt",
    c."startedAt" AS "campaignStartedAt",
    p."campaignId",
    c."dailySendLimit"
  FROM "CampaignParticipantDripStage" cpds
  JOIN "CampaignParticipant" p ON p.id = cpds."participantId"
  JOIN "Campaign" c ON c.id = p."campaignId"
  JOIN "CampaignDripStage" cds ON cds.id = cpds."dripStageId"
  WHERE cpds.status = 'PENDING' AND c.status = 'ACTIVE'
  ORDER BY cds.id, p."campaignId", p."createdAt" DESC
`);

  for (const row of results) {
    const {
      dripStageId,
      delay,
      delayUnit,
      sendAtTime,
      participantCreatedAt,
      campaignStartedAt,
      campaignId,
      dailySendLimit,
    } = row;

    const baseDate = dayjs(participantCreatedAt).isAfter(campaignStartedAt)
      ? dayjs(participantCreatedAt)
      : dayjs(campaignStartedAt);

    let sendAfter = dayjs(baseDate).add(delay, delayUnit as dayjs.ManipulateType);

    if (sendAtTime) {
      const [hours, minutes] = sendAtTime.split(":").map(Number);
      sendAfter = sendAfter.hour(hours).minute(minutes).second(0).millisecond(0);
    }

    if (dayjs().isAfter(sendAfter)) {
      // The cap applies per stage: each stage's pending participants are spread
      // across days. Re-enqueues of a stage are deduplicated by the dispatcher,
      // so an already-delayed participant keeps its original batch.
      await enqueueCampaignMessage(
        campaignId,
        [CampaignParticipantStatus.PENDING],
        undefined,
        undefined,
        dripStageId,
        dailySendLimit ?? undefined,
      );
    }
  }
}
