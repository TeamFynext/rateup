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
import { getOrCreateDripCampaignSend } from "../campaign/campaignSend.service.js";
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
  // One row per pending participant-stage, not one per stage.
  //
  // This used to be `DISTINCT ON (cds.id, p."campaignId") ... ORDER BY
  // p."createdAt" DESC`, which collapsed every participant on a stage down to
  // whichever had joined most recently and used that one date to decide whether
  // the whole stage was due. Enrolling a single new contact therefore pushed the
  // stage back for everyone already waiting on it. Due time is per participant,
  // so the rows have to be too.
  const results = await prisma.$queryRawUnsafe<
    {
      dripStageId: string;
      delay: number;
      delayUnit: string;
      sendAtTime: string | null;
      participantId: string;
      participantCreatedAt: Date;
      campaignStartedAt: Date | null;
      campaignId: string;
      dailySendLimit: number | null;
    }[]
  >(`
  SELECT
    cds.id AS "dripStageId",
    cds.delay,
    cds."delayUnit",
    cds."sendAtTime",
    p.id AS "participantId",
    p."createdAt" AS "participantCreatedAt",
    c."startedAt" AS "campaignStartedAt",
    p."campaignId",
    c."dailySendLimit"
  FROM "CampaignParticipantDripStage" cpds
  JOIN "CampaignParticipant" p ON p.id = cpds."participantId"
  JOIN "Campaign" c ON c.id = p."campaignId"
  JOIN "CampaignDripStage" cds ON cds.id = cpds."dripStageId"
  WHERE cpds.status = 'PENDING' AND c.status = 'ACTIVE'
  ORDER BY cds.id, p."campaignId", p."createdAt"
`);

  const now = Date.now();

  /**
   * Participants whose turn has come or comes before the next tick, grouped into
   * one enqueue per stage.
   *
   * The lookahead is what removes the tick's own latency. Sweeping for rows that
   * are *already* due means a stage due at 15:59 waits for the 16:02 pass — up to
   * a full interval late, every time, which is what made a two-stage drip look
   * like it was sending slowly. Arming the fan-out for the exact moment instead
   * puts the wait in BullMQ, where it costs nothing.
   */
  const due = new Map<
    string,
    {
      campaignId: string;
      dripStageId: string;
      dailySendLimit: number | null;
      participantIds: string[];
      dueAt: number;
    }
  >();

  for (const row of results) {
    const dueAt = dripStageDueAt(row).getTime();
    if (dueAt > now + DRIP_LOOKAHEAD_MS) continue;

    const key = `${row.campaignId}:${row.dripStageId}`;
    const batch = due.get(key) ?? {
      campaignId: row.campaignId,
      dripStageId: row.dripStageId,
      dailySendLimit: row.dailySendLimit,
      participantIds: [],
      // The stage fires when its earliest-due participant does. Anyone whose own
      // moment is later than that is still filtered by the next pass, because a
      // sent row stops being PENDING and an unsent one is picked up again.
      dueAt,
    };
    batch.participantIds.push(row.participantId);
    batch.dueAt = Math.min(batch.dueAt, dueAt);
    due.set(key, batch);
  }

  for (const batch of due.values()) {
    // One stage failing must not cost every stage behind it — and every other
    // campaign in this pass — its turn. Before this, a single throw skipped the
    // rest of the sweep until the next tick.
    try {
      // The cap applies per stage: each stage's due participants are spread
      // across days. Re-enqueues of a stage are deduplicated by the dispatcher,
      // so an already-delayed participant keeps its original batch.
      // One send session per stage, reused across ticks. A fresh session each
      // time would mint fresh job ids and defeat the deduplication this comment
      // relies on — every tick would re-send the whole stage.
      const send = await getOrCreateDripCampaignSend(batch.campaignId, batch.dripStageId);

      await enqueueCampaignMessage({
        campaignId: batch.campaignId,
        campaignSendId: send.id,
        sendToStatuses: [CampaignParticipantStatus.PENDING],
        // Only those actually due. Without this the enqueue took every PENDING row
        // on the stage, which is what made the per-stage gate above load-bearing.
        participantIds: batch.participantIds,
        dripStageId: batch.dripStageId,
        dailySendLimit: batch.dailySendLimit ?? undefined,
        // Armed for the exact moment when it is still ahead; immediate when it
        // has passed. Keyed by the send so re-arming on the next tick is the
        // same job rather than a second one.
        fanOutAt: new Date(batch.dueAt),
        jobId: `dripStage-${send.id}`,
      });
    } catch (error) {
      log.error(
        { err: error, campaignId: batch.campaignId, dripStageId: batch.dripStageId },
        "Failed to enqueue a drip stage",
      );
    }
  }
}

/**
 * How far ahead of the tick a stage may be armed.
 *
 * Slightly wider than the four-minute cron interval, so a stage due between two
 * passes is always caught by the earlier one rather than falling into the gap.
 */
const DRIP_LOOKAHEAD_MS = 5 * 60 * 1000;

/**
 * Whether a participant's stage is due now.
 *
 * The clock starts at whichever is later: when the participant joined, or when
 * the campaign was started — someone enrolled on day 5 of a campaign waits the
 * stage's delay from their own day 5, not from the campaign's day 0.
 */
export function isDripStageDue(row: DripDueInput & { now?: Date }): boolean {
  return dayjs(row.now ?? undefined).isAfter(dripStageDueAt(row));
}

export interface DripDueInput {
  delay: number;
  delayUnit: string;
  sendAtTime: string | null;
  participantCreatedAt: Date;
  campaignStartedAt: Date | null;
}

/**
 * The moment a participant's stage becomes sendable.
 *
 * Split out from the due check so the Overview card can show the same date the
 * cron will act on, rather than a second implementation of the same arithmetic
 * that can drift from it.
 *
 * Monotonic in `participantCreatedAt`: a later joiner is never due earlier. The
 * drip-schedule query leans on that to take one MIN per stage in SQL instead of
 * computing a date per pending recipient.
 */
export function dripStageDueAt(row: DripDueInput): Date {
  const joined = dayjs(row.participantCreatedAt);
  const started = row.campaignStartedAt ? dayjs(row.campaignStartedAt) : null;
  const baseDate = started && started.isAfter(joined) ? started : joined;

  let sendAfter = baseDate.add(row.delay, row.delayUnit as dayjs.ManipulateType);

  if (row.sendAtTime) {
    const [hours, minutes] = row.sendAtTime.split(":").map(Number);
    sendAfter = sendAfter.hour(hours).minute(minutes).second(0).millisecond(0);
  }

  return sendAfter.toDate();
}
