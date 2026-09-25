// Ported from message-dispatcher/src/index.ts.
//
// Fan-out step: turns one send session into one waMessageQueue job per
// participant. The access token is decrypted once for the whole batch rather
// than per message, and the ids of the jobs it creates are recorded in
// `campaignSend:<sendId>:jobs` so the message processor can tell when *that
// attempt* has drained — which is what closes the send and schedules the next
// retry.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import prisma from "../../../utils/prisma.js";
import { CampaignStatus } from "../../shared/types/enum.js";
import {
  decryptAccessToken,
  enqueueCampaignMessages,
  fetchCampaignParticipants,
  getSurveyTeamMapId,
  updateCampaignStatus,
} from "../../shared/whatsapp/index.js";
import { waMessageQueue } from "../queues/whatsapp.queue.js";
import {
  cancelCampaignSend,
  failCampaignSend,
  startCampaignSend,
} from "../../../modules/campaign/campaignSend.service.js";
import { notifyCampaignStopped } from "../../../modules/campaign/campaignNotify.js";

/**
 * A reason worth putting in front of the sender.
 *
 * The fan-out's failures are mostly configuration — a team with no WhatsApp
 * credentials, a template that no longer resolves — and the message says which.
 * A campaign that stops with no explanation is the thing that made "Paused" so
 * misleading in the first place.
 */
function causeOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "unknown error";
}

const workerConnection = baseRedis.duplicate();

export const campaignEnqueueWorker = new Worker(
  "waCampaignEnqueue",
  async (job: Job) => {
    const {
      campaignId,
      campaignSendId,
      participantId,
      participantIds,
      sendToStatuses,
      scheduledAt,
      dripStageId,
      dailySendLimit,
    } = job.data;
    log.trace(`Enqueuing campaign ${campaignId} (send ${campaignSendId})`);

    // Every fan-out belongs to a send session. Without one the jobs would carry
    // no attribution and the completion handler would have no set to drain, so
    // this is a hard stop rather than a fallback.
    if (!campaignSendId) {
      log.error({ campaignId }, "Campaign enqueue job has no campaignSendId — refusing to fan out");
      await updateCampaignStatus(
        campaignId,
        CampaignStatus.FAILED,
        null,
        true,
        "The send could not be started. Try sending it again.",
      );
      return;
    }

    try {
      // A drip stage is armed ahead of its moment, so minutes can pass between
      // booking this job and running it — long enough for someone to pause the
      // campaign. The cron's own `status = 'ACTIVE'` filter cannot cover that
      // window, so the check has to happen here too, at the point of sending.
      //
      // Any campaign the platform paused (allowance spent, billing rejected) is
      // skipped the same way, drip or not: fanning it out would only queue
      // messages that each get refused.
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });
      const paused = campaign?.status === CampaignStatus.PAUSED;
      if (paused || dripStageId) {
        if (paused || campaign?.status !== CampaignStatus.ACTIVE) {
          log.info(
            { campaignId, dripStageId, status: campaign?.status },
            "Drip stage skipped — the campaign is no longer active",
          );
          await cancelCampaignSend(
            campaignSendId,
            paused
              ? "The campaign was paused before this send ran."
              : "The campaign was paused before this stage ran.",
          );
          return;
        }
      }

      const participants = await fetchCampaignParticipants(
        campaignId,
        participantId,
        sendToStatuses,
        dripStageId,
        participantIds,
      );

      if (!participants.length) {
        log.error("No participants found matching the conditions");
        // Nothing to drain means the completion handler will never fire, so the
        // send has to be closed here or it would hold the campaign's lane open
        // against the partial unique index forever.
        await failCampaignSend(campaignSendId, "No participants matched the selected statuses.");
        // And the campaign itself: it was moved to QUEUING before this job ran,
        // so returning here left it reading as though it were still sending
        // forever, with nothing in the queue to finish it.
        await updateCampaignStatus(
          campaignId,
          CampaignStatus.FAILED,
          null,
          true,
          "No recipients matched this send, so nothing was sent.",
        );
        await notifyCampaignStopped(
          campaignId,
          "campaign.failed",
          "No recipients matched this send, so nothing was sent.",
        );
        return;
      }

      // Get survey team mapping if flow is present
      const surveyTeamMapId = await getSurveyTeamMapId(
        participants[0]?.data?.components,
        participants[0].teamId,
      );

      // Decrypt the access token once for all participants
      const decryptedToken = await decryptAccessToken(
        participants[0].accessToken,
        participants[0].accessToken_iv,
      );

      // Recorded before the fan-out, not after: once jobs are in the queue the
      // completion handler can fire at any moment, and it must not find the send
      // still in QUEUING with a zero target count.
      await startCampaignSend(campaignSendId, participants.length);

      await enqueueCampaignMessages({
        queue: waMessageQueue,
        participants,
        campaignId,
        campaignSendId,
        scheduledAt,
        accessToken: decryptedToken,
        surveyTeamMapId,
        connection: baseRedis,
        dailySendLimit,
      });

      // Not over PAUSED: the first messages of a large fan-out can hit the
      // allowance and pause the campaign before this line runs.
      await updateCampaignStatus(
        campaignId,
        scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.ACTIVE,
        scheduledAt,
        false,
        undefined,
        [CampaignStatus.PAUSED],
      );
    } catch (error) {
      // `{ err }`, not `%o`: pino's printf formatting JSON-stringifies its
      // argument, and an Error has no enumerable own properties — so every
      // failure in here logged the literal text `{}` and told nobody anything.
      log.error({ err: error, campaignId, campaignSendId }, "Error scheduling campaign");
      const reason = causeOf(error);
      await failCampaignSend(campaignSendId, `Fan-out failed: ${reason}`);
      // FAILED, not INACTIVE. INACTIVE is what a campaign someone paused looks
      // like, so a campaign that fell over on its way out was indistinguishable
      // from one that had been stopped on purpose — and carried no reason.
      await updateCampaignStatus(
        campaignId,
        CampaignStatus.FAILED,
        null,
        true,
        `The campaign could not be queued for sending: ${reason}`,
      );
      await notifyCampaignStopped(
        campaignId,
        "campaign.failed",
        "It could not be queued for sending.",
      );
    }
  },
  {
    connection: workerConnection,
    removeOnFail: {
      count: 1,
    },
  },
);

campaignEnqueueWorker.on("error", (err) => {
  log.error("Campaign enqueue worker error: %s", err);
});

log.info("Campaign enqueue worker initialized");
