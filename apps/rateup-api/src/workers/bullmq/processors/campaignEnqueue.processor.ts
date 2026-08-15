// Ported from message-dispatcher/src/index.ts.
//
// Fan-out step: turns one campaign into one waMessageQueue job per participant.
// The access token is decrypted once for the whole batch rather than per message,
// and the ids of the jobs it creates are recorded in `campaign:<id>:jobs` so the
// message processor can tell when the campaign has drained.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { CampaignStatus } from "../../shared/types/enum.js";
import {
  decryptAccessToken,
  enqueueCampaignMessages,
  fetchCampaignParticipants,
  getSurveyTeamMapId,
  updateCampaignStatus,
} from "../../shared/whatsapp/index.js";
import { waMessageQueue } from "../queues/whatsapp.queue.js";

const workerConnection = baseRedis.duplicate();

export const campaignEnqueueWorker = new Worker(
  "waCampaignEnqueue",
  async (job: Job) => {
    const { campaignId, participantId, sendToStatuses, scheduledAt, dripStageId, dailySendLimit } =
      job.data;
    log.trace(`Enqueuing campaign with ID: ${campaignId}`);

    try {
      const participants = await fetchCampaignParticipants(
        campaignId,
        participantId,
        sendToStatuses,
        dripStageId,
      );

      if (!participants.length) {
        log.error("No participants found matching the conditions");
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

      await enqueueCampaignMessages(
        waMessageQueue,
        participants,
        campaignId,
        scheduledAt,
        decryptedToken,
        surveyTeamMapId,
        baseRedis,
        dailySendLimit,
      );

      await updateCampaignStatus(
        campaignId,
        scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.ACTIVE,
        scheduledAt,
      );
    } catch (error) {
      log.error("Error scheduling campaign: %o", error);
      await updateCampaignStatus(campaignId, CampaignStatus.INACTIVE, null, true);
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
