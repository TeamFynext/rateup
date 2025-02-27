import dayjs from "dayjs";
import prisma from "../../utils/prisma";
import { WaSendMessageBody } from "../../types/whatsapp.types";
import {
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

type weeklyStats = {
  email: string;
  surveys: {
    surveyId: string;
    title: string;
    type: string;
    totalCount: number;
    weeklyCount: number;
    dbFlowId?: string;
    flowVersion?: number;
  }[];
}[];

export async function sendWeeklyReportToEmail() {
  const reports: weeklyStats = await prisma.$queryRaw`
  SELECT
    u.email,
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'surveyId', s.id,
        'title', COALESCE(wf.name, s.title),
        'type', s.type,
        'totalCount', total_count,
        'weeklyCount', weekly_count,
        'dbFlowId', wf."dbFlowId",
        'flowVersion', wf."version"
      )
      ORDER BY s.type ASC, COALESCE(wf.name, s.title) ASC
    ) AS surveys
  FROM "Survey" s
  LEFT JOIN "WaFlow" wf ON s.id = wf."surveyId"
  LEFT JOIN "SurveyTeamMap" stm ON s.id = stm."surveyId"
  LEFT JOIN "TeamMember" tm ON tm."teamId" = stm."teamId"
  LEFT JOIN "User" u ON u.id = tm."userId"
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE sr."createdAt" >= NOW() - INTERVAL '7 days') AS weekly_count
    FROM "SurveyResponse" sr
    WHERE sr."surveyTeamMapId" = stm.id
  ) response_counts ON TRUE
  WHERE s."sendWeeklyReport" = TRUE 
    AND s.active = TRUE
    AND u.active = TRUE
  GROUP BY u.email;
;
`;
  for (const report of reports) {
    const surveys = report.surveys.filter((survey) => survey.weeklyCount > 0);
    if (!surveys.length) continue;
    const msg = {
      to: report.email,
      subject: "Weekly Report of Stats of Web Survey and WhatsApp Survey",
      text: "weekly report",
      html: createMessageTemplate({
        body: surveys
          .map((survey) => {
            const responseUrl =
              survey.type === "web"
                ? `${FRONTEND_URL}/dashboard/surveys/${survey.surveyId}?tab=Result"`
                : `${FRONTEND_URL}/dashboard/whatsapp/flows/v${survey.flowVersion}/${survey.dbFlowId}?tab=Result`;
            return `<tr>
              <td>${survey?.title}</td>
              <td>${survey?.totalCount}</td>
              <td>${survey?.weeklyCount}</td>
              <td><a href="${responseUrl}"
              target="blank" style="color:#f5f5f5" class="view-response">View Responses</a></td>
            </tr>`;
          })
          .join(""),
      }),
    };
    sendAWSEmail(msg);
  }
}
