import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { CampaignStatus, CampaignType } from "../../types/enums.js";
import { CampaignSendStatus } from "../../../generated/prisma/enums.js";

import { LIVE_SEND_STATUSES, cancelCampaignSends } from "./campaignSend.service.js";
import { countInFlightParticipants, getRetryCohort } from "./campaignRetryCohort.js";

/** Statuses a settle pass is allowed to move a campaign out of. */
const SETTLEABLE = [CampaignStatus.ACTIVE, CampaignStatus.QUEUING, CampaignStatus.RETRYING];

/**
 * Decide what a campaign's send has amounted to, once that is knowable.
 *
 * Called by the finisher that drained a send session, and again by the settle
 * sweep as delivery statuses land.
 *
 * The order of the checks is the whole design:
 *
 * 1. A QUEUING or RUNNING send means messages are going out right now — a manual
 *    resend alongside this one, say — so the campaign is left alone.
 * 2. Participants still PENDING or SENT mean the outcome is not in yet. A queue
 *    drains when Meta has *accepted* the last message, not when it has been
 *    delivered, so at that moment almost everything is still SENT. Concluding
 *    anything here is what made a clean campaign announce a retry it did not
 *    need. The sweep comes back for it.
 * 3. With nothing in flight, the cohort is the whole truth. Empty means nothing
 *    failed retryably, so any booked attempt is cancelled and the campaign is
 *    COMPLETED; non-empty with an attempt still booked is RETRYING.
 *
 * Returns the status it wrote, or null if it left the campaign alone.
 */
export async function finishCampaignIfSettled(campaignId: string): Promise<CampaignStatus | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, type: true },
  });
  if (!campaign) return null;

  // A drip campaign is never finished by a drained stage: the drip cron keeps
  // enrolling participants and re-enqueuing, so its cadence owns the status.
  if (campaign.type === CampaignType.DRIP) return null;

  const live = await prisma.campaignSend.findMany({
    where: { campaignId, status: { in: [...LIVE_SEND_STATUSES] } },
    select: { status: true },
  });
  if (live.some((send) => send.status !== CampaignSendStatus.SCHEDULED)) return null;

  if ((await countInFlightParticipants(campaignId)) > 0) return null;

  const cohort = await getRetryCohort(campaignId);
  let next: CampaignStatus;
  if (cohort.length === 0) {
    if (live.length) {
      // Booked while the outcome was still unknown, and now known to be pointless.
      await cancelCampaignSends(campaignId, {
        onlyScheduled: true,
        note: "Nothing failed retryably, so no retry was needed.",
      });
    }
    next = CampaignStatus.COMPLETED;
  } else {
    // A cohort with no attempt booked means the retry policy is done with this
    // campaign — exhausted, disabled, or out of window. Nothing more will happen.
    next = live.length ? CampaignStatus.RETRYING : CampaignStatus.COMPLETED;
  }

  const { count } = await prisma.campaign.updateMany({
    where: { id: campaignId, status: { in: SETTLEABLE } },
    data: {
      status: next,
      // Only a finished campaign has an end. A retry window is still ahead of it.
      ...(next === CampaignStatus.COMPLETED ? { endedAt: new Date() } : {}),
    },
  });
  return count > 0 ? next : null;
}

/** How many campaigns one sweep will look at. */
const SWEEP_LIMIT = 200;

/**
 * Settle the campaigns whose sends have drained but whose outcome was not yet
 * known when they drained.
 *
 * Nothing else revisits them: `finishCampaignIfSettled` runs once, from the
 * finisher of the send that drained, and at that moment the delivery webhooks
 * are still arriving. Without this pass a campaign whose messages all landed
 * cleanly would sit on ACTIVE — or on a booked RETRYING — until the retry came
 * due and cancelled itself, up to an hour later.
 */
export async function settleSentCampaigns(): Promise<{ settled: number }> {
  const candidates = await prisma.campaign.findMany({
    where: {
      status: { in: SETTLEABLE },
      type: { not: CampaignType.DRIP },
      // Only campaigns that have actually dispatched: a DRAFT or a campaign that
      // never opened a send has nothing to settle.
      CampaignSend: { some: {} },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: SWEEP_LIMIT,
  });

  let settled = 0;
  for (const campaign of candidates) {
    try {
      if (await finishCampaignIfSettled(campaign.id)) settled++;
    } catch (error) {
      // One campaign's failure must not stop the rest of the sweep.
      log.error({ err: error, campaignId: campaign.id }, "Could not settle a campaign");
    }
  }
  if (settled) log.info({ settled }, "Settled campaigns whose sends have landed");
  return { settled };
}
