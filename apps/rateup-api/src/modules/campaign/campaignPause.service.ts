/**
 * Stop a campaign because the *account* cannot send, not because anything is
 * wrong with the campaign.
 *
 * Two causes qualify, and both are org-wide: every remaining recipient would be
 * refused for the same reason, so carrying on only turns a whole audience into
 * FAILED rows one at a time.
 *
 * - The conversation allowance is spent. `sendMetaMessage` refuses before it
 *   calls Meta, with `ConversationLimitError`.
 * - Meta rejects the payment method (131042): no credit line, a line over its
 *   limit, or billing settings missing on the WhatsApp Business account.
 *
 * What a pause does:
 *
 * 1. Claims the campaign by moving it to PAUSED — atomically, so of the 250
 *    jobs that hit the same wall at once exactly one runs the rest.
 * 2. Flags every live send session, so jobs already out of the queue skip
 *    instead of reaching Meta.
 * 3. Takes the pending jobs out of the queue and closes the send sessions, the
 *    same walk an owner's pause does. A closed session never completes, so no
 *    retry is booked and no "Campaign completed" email goes out.
 *
 * Recipients are left PENDING. Sending again once the cause is fixed — the
 * existing Resume, which targets PENDING — picks up exactly where it stopped.
 */
import baseRedis from "../../utils/redisConnection.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import { CampaignPauseReason, CampaignStatus } from "../../types/enums.js";
import { campaignSendPausedKey } from "../../workers/shared/campaignSendKeys.js";
import { cancelPendingCampaignJobs } from "./campaignCancel.service.js";
import { cancelCampaignSends, LIVE_SEND_STATUSES } from "./campaignSend.service.js";

/** Meta's "error related to your payment method". */
export const WA_PAYMENT_METHOD_ERROR_CODE = 131042;

/**
 * Statuses a campaign can be sending from. DEQUEUING and INACTIVE are left
 * alone: the owner is already stopping it, and their pause wins.
 */
const PAUSABLE: readonly string[] = [
  CampaignStatus.ACTIVE,
  CampaignStatus.QUEUING,
  CampaignStatus.SCHEDULED,
  CampaignStatus.RETRYING,
];

/**
 * How long a send's paused flag outlives the pause. Only has to cover the jobs
 * that were already running or racing the cancel — minutes — but a delayed job
 * that survived a locked-job race could sit for as long as a schedule is ahead.
 */
const PAUSED_FLAG_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * Shown on the campaign page and in the status badge's hover card. The UI keys
 * its banner off `pauseReason` and has its own copy; this is the fallback for
 * anything that only reads `errorMessage`.
 */
export const CAMPAIGN_PAUSE_MESSAGES: Record<CampaignPauseReason, string> = {
  [CampaignPauseReason.CONVERSATION_LIMIT]:
    "Paused: your plan's conversation allowance is used up. Upgrade your plan or wait for it to reset, then resume the campaign.",
  [CampaignPauseReason.PAYMENT_METHOD]:
    "Paused: Meta rejected the payment method on your WhatsApp Business account. Fix billing in Meta Business Suite, then resume the campaign.",
};

/** The pause a failed send calls for, if any. Null for every per-recipient failure. */
export function pauseReasonForMetaError(
  code: number | null | undefined,
): CampaignPauseReason | null {
  return code === WA_PAYMENT_METHOD_ERROR_CODE ? CampaignPauseReason.PAYMENT_METHOD : null;
}

/** Whether this send session has been stopped by a pause. One Redis GET. */
export async function isCampaignSendPaused(campaignSendId: string): Promise<boolean> {
  return (await baseRedis.exists(campaignSendPausedKey(campaignSendId))) === 1;
}

/**
 * Pause `campaignId` for `reason`.
 *
 * Returns true only for the call that actually paused it. Every other caller —
 * the rest of a burst of jobs hitting the same limit, or a campaign the owner
 * already stopped — gets false and has nothing further to do.
 */
export async function pauseCampaignForAccountIssue(
  campaignId: string,
  reason: CampaignPauseReason,
): Promise<boolean> {
  const { count } = await prisma.campaign.updateMany({
    where: { id: campaignId, status: { in: [...PAUSABLE] } },
    data: {
      status: CampaignStatus.PAUSED,
      pauseReason: reason,
      pausedAt: new Date(),
      errorMessage: CAMPAIGN_PAUSE_MESSAGES[reason],
      // A scheduled campaign is no longer due at its old time; resuming asks again.
      campaignSentAt: null,
    },
  });
  if (count === 0) return false;

  log.warn({ campaignId, reason }, "Campaign paused — the account cannot send");

  try {
    // Flag first, cancel second: the cancel walk can take seconds on a large
    // campaign, and every job that runs meanwhile should find the flag.
    const live = await prisma.campaignSend.findMany({
      where: { campaignId, status: { in: [...LIVE_SEND_STATUSES] } },
      select: { id: true },
    });
    if (live.length) {
      const pipeline = baseRedis.multi();
      for (const { id } of live) {
        pipeline.set(campaignSendPausedKey(id), reason, "EX", PAUSED_FLAG_TTL_SECONDS);
      }
      await pipeline.exec();
    }

    const cancelled = await cancelPendingCampaignJobs(campaignId);
    await cancelCampaignSends(campaignId, { note: CAMPAIGN_PAUSE_MESSAGES[reason] });
    log.info(
      { campaignId, reason, ...cancelled },
      "Took a paused campaign's messages out of the queue",
    );
  } catch (error) {
    // The campaign is PAUSED either way, and every job that still runs will hit
    // the same limit and leave its recipient PENDING. Losing the cleanup costs
    // wasted work, not a wrong outcome — so it is logged, not rethrown into a
    // send job that has nothing to do with it.
    log.error({ err: error, campaignId, reason }, "Paused a campaign but could not dequeue it");
  }
  return true;
}

/**
 * Clear the pause fields when a campaign is sent again. The banner is keyed on
 * status as well, so this is tidiness rather than correctness.
 */
export async function clearCampaignPause(campaignId: string): Promise<void> {
  await prisma.campaign.updateMany({
    where: { id: campaignId, pauseReason: { not: null } },
    data: { pauseReason: null, pausedAt: null },
  });
}
