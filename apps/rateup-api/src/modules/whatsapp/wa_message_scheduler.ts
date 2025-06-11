import dayjs from "dayjs";
import prisma from "../../utils/prisma";
import { WaSendMessageBody } from "../../types/whatsapp.types";
import {
  CampaignParticipantStatus,
  SubscriptionFeaturePathName,
  waMessageScheduleSource,
  WaMessageScheduleStatus,
} from "../../types/enums";
import { log } from "../../utils/logger";
import { sendMessage } from "./whatsappSurvey/wasurvey.service";
import { getFlowIdFromTemplateComponents } from "../external/v1/whatsapp/internal-copy/whatsapp/messageTemplates/wa_templates.utils";
import {
  createSession,
  deleteSession,
} from "../external/v1/whatsapp/internal-copy/whatsapp/whatsappSurvey/wasurvey.service";
import { getFlowWithSurveyTeamMapIds } from "../external/v1/whatsapp/internal-copy/whatsapp/flows/flow.service";
import { getScheduleTime } from "../../utils/date";
import { updateMonthlyStat } from "../stats/stats.service";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import { createMessageTemplate } from "../../utils/email/emailWeeklyStatsReport";
import { FRONTEND_URL } from "../../utils/constants/constants";
import { enqueueCampaignMessage } from "../campaign/campaign.service";

interface waMessageScheduleProps {
  phone: string;
  messageBody: WaSendMessageBody;
  orgId: string;
  waTemplateId?: string;
  surveyTeamMapId?: string;
  timeDelay: number;
  source: waMessageScheduleSource;
}

export async function createWaMessageSchedule({
  phone,
  messageBody,
  orgId,
  waTemplateId,
  surveyTeamMapId,
  timeDelay,
  source,
}: waMessageScheduleProps) {
  const res = await prisma.waMessageSchedule.create({
    data: {
      phone,
      scheduledAt: getScheduleTime(timeDelay, new Date()),
      orgId,
      waTemplateId,
      messageBody: messageBody as any,
      surveyTeamMapId,
      source,
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
        const containsFlowButton = !!getFlowIdFromTemplateComponents(
          (schedule.waTemplate.data as any).components,
        );
        if (containsFlowButton) {
          const flowId = getFlowIdFromTemplateComponents(
            (schedule.waTemplate.data as any).components,
          );
          if (!flowId) {
            log.error(
              "Flow id not found in template\n Template => %o",
              schedule.waTemplate.data,
            );
            throw new Error("Flow id not found in template");
          }
          const dbFlow = await getFlowWithSurveyTeamMapIds(
            schedule.orgId,
            flowId,
          );
          if (!dbFlow) {
            log.error("Flow not found in db with id %s", flowId);
            throw new Error("Flow not found in db");
          }
          if (!schedule.surveyTeamMapId) {
            throw new Error("surveyTeamMapId not found");
          }
          await deleteSession(schedule.orgId, schedule.phone);
          await createSession({
            phone: schedule.phone,
            orgId: schedule.orgId,
            surveyTeamMapId: schedule.surveyTeamMapId,
            language: dbFlow?.survey?.languages[0],
          });
          log.trace("Session created successfully");
        }
        const res = await sendMessage(
          schedule.orgId,
          schedule.messageBody as unknown as WaSendMessageBody,
        );
        await prisma.waMessageSchedule.update({
          where: {
            id: schedule.id,
          },
          data: {
            status: res.status
              ? WaMessageScheduleStatus.SENT
              : WaMessageScheduleStatus.FAILED,
            messageId: res.status ? res.message : undefined,
          },
        });
        await updateMonthlyStat(
          SubscriptionFeaturePathName.Whatsapp,
          schedule.orgId,
        );
      }),
    );
  } catch (e) {
    log.error("error in wamessageschedule %o", e);
  }
}

// Cron job entry point
export async function processDripCampaigns() {
  // Fetch all campaign drip stages with their related participant drip stages and participants
  const dripStages = await prisma.campaignDripStage.findMany({
    include: {
      waTemplate: true,
      CampaignParticipantDripStage: {
        where: {
          status: "PENDING",
          participant: {
            campaign: {
              status: "ACTIVE",
            },
          },
        },
        include: {
          participant: {
            include: {
              contact: true,
              campaign: true,
            },
          },
        },
      },
    },
  });

  for (const dripStage of dripStages) {
    for (const stage of dripStage.CampaignParticipantDripStage) {
      const campaignStartDate = stage.participant.campaign.startedAt;
      const participantCreatedAt = stage.participant.createdAt;

      // Use campaign startDate if participant was added before or at campaign start, else use participant createdAt
      const baseDate = dayjs(participantCreatedAt).isAfter(campaignStartDate)
        ? dayjs(participantCreatedAt)
        : dayjs(campaignStartDate);
      let sendAfter = dayjs(baseDate).add(
        dripStage.delay,
        dripStage.delayUnit as dayjs.ManipulateType,
      );

      // If sendAtTime is set, adjust sendAfter to that time of day
      if (dripStage.sendAtTime) {
        const [hours, minutes] = dripStage.sendAtTime.split(":").map(Number);
        sendAfter = sendAfter
          .hour(hours)
          .minute(minutes)
          .second(0)
          .millisecond(0);
      }
      if (dayjs().isAfter(sendAfter)) {
        await enqueueCampaignMessage(
          stage.participant.campaignId,
          [CampaignParticipantStatus.PENDING],
          undefined,
          undefined,
          dripStage.id,
        );
      }
    }
  }
}
