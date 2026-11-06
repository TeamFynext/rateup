import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { LoyaltyFeedbackRequestStatus } from "../../../../generated/prisma/client.js";
import { WaFlowStatus } from "../../../types/enums.js";
import { sendLoyalty } from "../messaging/send.js";
import { ensureSurveyTeamMap } from "./feedback.teamMap.js";

/**
 * Fires one feedback request when its delayed job comes due. Worker-only: this reaches
 * into the flow and template senders, which the API-side scheduler must not import.
 *
 * Which message goes out depends on the customer's 24-hour service window. Inside it an
 * interactive flow message is allowed and free; outside it only an approved template can
 * reach the customer, so the FLOW-button template created at submit time is used. Either
 * way the flow token carries the request id, which is what lets the completion be filed
 * against this row.
 */

export type FireFeedbackResult = "sent" | "cancelled" | "failed" | "skipped";

export const FEEDBACK_TEMPLATE_CHANNEL = "template";
export const FEEDBACK_INTERACTIVE_CHANNEL = "interactive";

export async function fireFeedbackRequest(requestId: string): Promise<FireFeedbackResult> {
  // The claim: only a SCHEDULED row may fire, and flipping it here is what makes a
  // duplicated or stale job a no-op. A crash between this and the send leaves a SENT
  // row for a message that never went out — accepted over introducing a SENDING state.
  const claimed = await prisma.loyaltyFeedbackRequest.updateMany({
    where: { id: requestId, status: LoyaltyFeedbackRequestStatus.SCHEDULED },
    data: { status: LoyaltyFeedbackRequestStatus.SENT, sentAt: new Date() },
  });
  if (claimed.count === 0) return "skipped";

  const request = await prisma.loyaltyFeedbackRequest.findUnique({
    where: { id: requestId },
    include: {
      program: {
        select: {
          id: true,
          orgId: true,
          status: true,
          name: true,
          businessName: true,
          feedbackSetting: {
            include: {
              flow: {
                select: { dbFlowId: true, status: true, surveyId: true, whatsappSettingsId: true },
              },
              waTemplate: { select: { id: true, data: true } },
            },
          },
        },
      },
      account: {
        select: { status: true, contact: { select: { phone: true, name: true } } },
      },
    },
  });
  if (!request) {
    log.error({ requestId }, "Claimed feedback request vanished before it could be sent");
    return "skipped";
  }

  const settle = async (
    status: LoyaltyFeedbackRequestStatus,
    failReason: string,
  ): Promise<FireFeedbackResult> => {
    await prisma.loyaltyFeedbackRequest.update({
      where: { id: requestId },
      data: { status, failReason },
    });
    return status === LoyaltyFeedbackRequestStatus.CANCELLED ? "cancelled" : "failed";
  };
  const cancel = (reason: string) => settle(LoyaltyFeedbackRequestStatus.CANCELLED, reason);
  const fail = (reason: string) => settle(LoyaltyFeedbackRequestStatus.FAILED, reason);

  // Everything the scheduler checked is checked again: the delay can be hours, and the
  // business may have paused the programme or switched feedback off in between.
  const setting = request.program.feedbackSetting;
  if (!setting) return cancel("Feedback has been removed");
  if (!setting.enabled) return cancel("Feedback is switched off");
  if (request.program.status !== "active") return cancel("Programme is not active");
  const flow = setting.flow;
  if (!flow || flow.status !== WaFlowStatus.PUBLISHED) return cancel("Flow is not published");
  if (request.account.status !== "active") return cancel("Customer account is not active");
  const phone = request.account.contact?.phone;
  if (!phone) return cancel("Customer has no phone number");

  if (setting.cooldownDays > 0) {
    // Two purchases a minute apart both schedule before either has been sent; the second
    // to fire finds the first already sent and stands down.
    const since = new Date(Date.now() - setting.cooldownDays * 24 * 60 * 60 * 1000);
    const other = await prisma.loyaltyFeedbackRequest.findFirst({
      where: {
        accountId: request.accountId,
        id: { not: requestId },
        status: { in: [LoyaltyFeedbackRequestStatus.SENT, LoyaltyFeedbackRequestStatus.COMPLETED] },
        sentAt: { gte: since },
      },
      select: { id: true },
    });
    if (other) return cancel("Asked for feedback within the cooldown window");
  }

  const orgId = request.program.orgId;
  const surveyTeamMapId = await ensureSurveyTeamMap(flow.surveyId, setting.teamId);
  const customerName = request.account.contact?.name?.trim() || "there";
  const businessName = request.program.businessName?.trim() || request.program.name;

  try {
    const outcome = await sendLoyalty({
      orgId,
      to: { accountId: request.accountId },
      intent: { kind: "notify" },
      message: {
        key: "feedback_request",
        text: null,
        parts: {
          flow: {
            dbFlowId: flow.dbFlowId,
            context: { surveyTeamMapId, language: "en", feedbackRequestId: requestId },
          },
        },
        ...(setting.waTemplate
          ? {
              artefacts: {
                WHATSAPP: {
                  waTemplateId: setting.waTemplate.id,
                  params: [customerName, businessName],
                  teamId: setting.teamId,
                  flowContext: { feedbackRequestId: requestId },
                },
              },
            }
          : {}),
      },
    });

    if (!outcome.sent) {
      if (outcome.skippedReason === "send_failed") {
        return fail(outcome.error || "WhatsApp send failed");
      }
      return cancel("Template is not approved by Meta");
    }
    await prisma.loyaltyFeedbackRequest.update({
      where: { id: requestId },
      data: {
        channel:
          outcome.mode === "template" ? FEEDBACK_TEMPLATE_CHANNEL : FEEDBACK_INTERACTIVE_CHANNEL,
      },
    });
    return "sent";
  } catch (error) {
    log.error({ err: error, requestId }, "Feedback request send threw");
    return fail(error instanceof Error ? error.message : "WhatsApp send failed");
  }
}
