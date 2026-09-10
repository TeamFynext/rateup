import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { LoyaltyFeedbackRequestStatus } from "../../../../generated/prisma/client.js";
import { WaFlowStatus } from "../../../types/enums.js";
import {
  armFeedbackRequest,
  disarmFeedbackRequest,
  loyaltyFeedbackJobId,
  loyaltyFeedbackSendQueue,
} from "../../../workers/bullmq/queues/loyaltyFeedback.queue.js";

/**
 * Opens a feedback request when points are earned and arms its delayed job.
 *
 * Imported by account.service.ts (the awardPoints funnel), which is itself reachable from
 * the WhatsApp reply handlers — so this file deliberately imports nothing from the flow or
 * template modules. Sending lives in feedback.sender.ts, which only the worker loads.
 */

export type ScheduleFeedbackResult =
  | { scheduled: true; requestId: string; scheduledFor: Date }
  | {
      scheduled: false;
      reason:
        | "no_setting"
        | "disabled"
        | "flow_not_published"
        | "template_not_approved"
        | "program_inactive"
        | "no_phone"
        | "cooldown"
        | "duplicate_transaction";
    };

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function templateIsApproved(template: { data: unknown } | null | undefined): boolean {
  const status = (template?.data as { status?: unknown } | null)?.status;
  return status === "APPROVED";
}

export async function scheduleFeedbackRequest(input: {
  programId: string;
  accountId: string;
  transactionId?: string | null;
}): Promise<ScheduleFeedbackResult> {
  const setting = await prisma.loyaltyFeedbackSetting.findUnique({
    where: { programId: input.programId },
    include: {
      flow: { select: { status: true } },
      waTemplate: { select: { data: true } },
      program: { select: { status: true } },
    },
  });
  if (!setting) return { scheduled: false, reason: "no_setting" };
  if (!setting.enabled) return { scheduled: false, reason: "disabled" };
  if (setting.program.status !== "active") return { scheduled: false, reason: "program_inactive" };
  if (setting.flow?.status !== WaFlowStatus.PUBLISHED) {
    return { scheduled: false, reason: "flow_not_published" };
  }
  if (!templateIsApproved(setting.waTemplate)) {
    return { scheduled: false, reason: "template_not_approved" };
  }

  const account = await prisma.customerLoyaltyAccount.findUnique({
    where: { id: input.accountId },
    select: { contact: { select: { phone: true } } },
  });
  if (!account?.contact?.phone) return { scheduled: false, reason: "no_phone" };

  // One ask per customer per cooldown window. COMPLETED counts: it was sent too.
  if (setting.cooldownDays > 0) {
    const since = new Date(Date.now() - setting.cooldownDays * 24 * 60 * 60 * 1000);
    const recent = await prisma.loyaltyFeedbackRequest.findFirst({
      where: {
        accountId: input.accountId,
        status: {
          in: [
            LoyaltyFeedbackRequestStatus.SCHEDULED,
            LoyaltyFeedbackRequestStatus.SENT,
            LoyaltyFeedbackRequestStatus.COMPLETED,
          ],
        },
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (recent) return { scheduled: false, reason: "cooldown" };
  }

  const scheduledFor = new Date(Date.now() + setting.sendDelayMinutes * 60 * 1000);
  let requestId: string;
  try {
    const created = await prisma.loyaltyFeedbackRequest.create({
      data: {
        programId: input.programId,
        accountId: input.accountId,
        transactionId: input.transactionId ?? null,
        scheduledFor,
      },
      select: { id: true },
    });
    requestId = created.id;
  } catch (error) {
    if (isUniqueViolation(error)) return { scheduled: false, reason: "duplicate_transaction" };
    throw error;
  }

  // The row is what is scheduled; a job that fails to arm is re-armed by the reconciler
  // on the next worker start, so arming is not allowed to fail the points award.
  try {
    await armFeedbackRequest(requestId, scheduledFor);
  } catch (error) {
    log.error({ err: error, requestId }, "Could not arm feedback request; reconciler will");
  }

  return { scheduled: true, requestId, scheduledFor };
}

/** Cancels every request still waiting to fire — used when feedback is switched off or reset. */
export async function cancelScheduledFeedbackRequests(
  programId: string,
  reason: string,
): Promise<number> {
  const scheduled = await prisma.loyaltyFeedbackRequest.findMany({
    where: { programId, status: LoyaltyFeedbackRequestStatus.SCHEDULED },
    select: { id: true },
  });
  if (!scheduled.length) return 0;

  const { count } = await prisma.loyaltyFeedbackRequest.updateMany({
    where: {
      id: { in: scheduled.map((r) => r.id) },
      status: LoyaltyFeedbackRequestStatus.SCHEDULED,
    },
    data: { status: LoyaltyFeedbackRequestStatus.CANCELLED, failReason: reason },
  });
  await Promise.all(scheduled.map((r) => disarmFeedbackRequest(r.id)));
  return count;
}

/**
 * Re-arms SCHEDULED rows whose delayed job Redis no longer holds. Run at worker startup;
 * idempotent, since arming an already-armed id is collapsed by BullMQ.
 */
export async function reconcileScheduledFeedbackRequests(): Promise<{
  checked: number;
  armed: number;
}> {
  const scheduled = await prisma.loyaltyFeedbackRequest.findMany({
    where: { status: LoyaltyFeedbackRequestStatus.SCHEDULED },
    select: { id: true, scheduledFor: true },
  });

  let armed = 0;
  for (const request of scheduled) {
    const existing = await loyaltyFeedbackSendQueue.getJob(loyaltyFeedbackJobId(request.id));
    if (existing) continue;
    await armFeedbackRequest(request.id, request.scheduledFor);
    armed++;
  }

  if (armed) log.warn({ armed }, "Re-armed scheduled feedback requests with no delayed job");
  return { checked: scheduled.length, armed };
}
