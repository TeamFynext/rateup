import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { LoyaltyFeedbackRequestStatus } from "../../../../generated/prisma/client.js";
import { sendMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { getWaSettingsById } from "../../whatsapp/settings/wa_settings.service.js";
import { createCTAButtonMessage } from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { buildReviewRedirectUrl } from "./feedback.redirect.js";
import { extractOverallRating, type FlowAnswer } from "./feedback.evaluate.js";
import { resolveTeamGoogleLink } from "./feedback.googleLink.js";

export { resolveTeamGoogleLink } from "./feedback.googleLink.js";

/**
 * What the flow-completion paths in flow.service.ts call when the run they just saved
 * was sent by the feedback scheduler. Both the encrypted `data_exchange` endpoint and the
 * static `nfm_reply` webhook end up here, so this is where a feedback ask is closed.
 */

export interface FeedbackFlowCompletion {
  requestId: string;
  orgId: string;
  phone: string;
  surveyResponseId: string;
  /** The Google-review gate's verdict, computed by the caller with shouldShowGoogleReviewV2. */
  happy: boolean;
  screens: WaFlowScreen[];
  responses: FlowAnswer[];
}

export async function onFeedbackFlowCompleted(input: FeedbackFlowCompletion): Promise<void> {
  const request = await prisma.loyaltyFeedbackRequest.findUnique({
    where: { id: input.requestId },
    include: {
      program: {
        select: {
          orgId: true,
          feedbackSetting: {
            include: {
              team: true,
              reward: true,
              // The channel the survey itself went out on — see the send below.
              flow: { select: { whatsappSettingsId: true } },
            },
          },
        },
      },
    },
  });
  if (!request) {
    log.warn({ requestId: input.requestId }, "Feedback flow completed for an unknown request");
    return;
  }
  if (request.program.orgId !== input.orgId) {
    log.error(
      { requestId: input.requestId, orgId: input.orgId },
      "Feedback flow completion arrived under a different org; ignoring it",
    );
    return;
  }

  const overallRating = extractOverallRating(
    { version: "7.2", screens: input.screens },
    input.responses,
  );

  // Meta retries a data_exchange that timed out, and the same answers can also arrive
  // once more as an nfm_reply. Only the first completion closes the row and sends the
  // CTA; anything after it finds the row already COMPLETED and stops here.
  const closed = await prisma.loyaltyFeedbackRequest.updateMany({
    where: {
      id: request.id,
      status: { in: [LoyaltyFeedbackRequestStatus.SENT, LoyaltyFeedbackRequestStatus.SCHEDULED] },
    },
    data: {
      status: LoyaltyFeedbackRequestStatus.COMPLETED,
      completedAt: new Date(),
      happy: input.happy,
      overallRating,
      surveyResponseId: input.surveyResponseId,
    },
  });
  if (closed.count === 0) {
    log.info({ requestId: request.id }, "Feedback request was already completed");
    return;
  }

  if (!input.happy) return;

  const setting = request.program.feedbackSetting;
  const googleLink = setting ? resolveTeamGoogleLink(setting.team) : null;
  if (!googleLink) {
    log.info(
      { requestId: request.id },
      "Happy feedback but the team has no Google review link; nothing to send",
    );
    return;
  }

  const reward = setting?.reward;
  const rewardIsActive = reward && reward.status.toLowerCase() === "active";
  const body = rewardIsActive
    ? `Thank you for your feedback! Leave us a Google review and we'll send you: ${reward.name}.`
    : "Thank you for your feedback! Would you mind sharing it as a Google review?";

  // Sent from the number the survey went out on, not from the org default. `sendFlow`
  // picks the flow's own channel, so on a multi-number org the default is a *different*
  // number, with no open 24-hour window for this customer — the CTA would be refused and
  // the customer would see nothing after answering.
  const channel = await flowChannelPhoneId(input.orgId, setting?.flow?.whatsappSettingsId);

  await sendMessage(
    input.orgId,
    createCTAButtonMessage({
      to: input.phone,
      body,
      buttonText: "Review us on Google",
      url: buildReviewRedirectUrl(request.id),
    }),
    undefined,
    undefined,
    channel,
  );
}

/**
 * The `phoneId` of the channel a flow belongs to. Undefined leaves `sendMessage` on the
 * org default, which is the right answer when the flow names no channel of its own.
 */
async function flowChannelPhoneId(
  orgId: string,
  whatsappSettingsId: string | null | undefined,
): Promise<string | undefined> {
  if (!whatsappSettingsId) return undefined;
  const settings = await getWaSettingsById(whatsappSettingsId, orgId);
  return settings?.phoneId ?? undefined;
}
