import { getCampaignCreditBudget } from "../subscription/campaignCredits.js";
import {
  getCampaignMessagesPerRecipient,
  getCampaignParticipantCountByIds,
  getCampaignParticipantCountByStatuses,
} from "./campaign.service.js";
import type { CampaignParticipantStatus } from "../../types/enums.js";

export interface CampaignSendPreflight {
  /** Participants this send would go out to. */
  recipients: number;
  /**
   * Messages per recipient — a drip's stage count, 1 for a broadcast. A credit is spent
   * per message, so a 3-stage drip to 50 people is 150.
   */
  messagesPerRecipient: number;
  /** False when the plan does not cap campaign sends — nothing to warn about. */
  metered: boolean;
  /** The plan's monthly credits and how many are spent, when metered. */
  max?: number;
  used?: number;
  /** Unspent credits in packs. */
  packRemaining?: number;
  /** Plan credits left plus pack credits. */
  remaining?: number;
  /** True when no credit is left: nothing would be sent. */
  exhausted: boolean;
  /** Messages beyond what the credits cover. Zero when the campaign fits. */
  shortfall: number;
}

/**
 * What a campaign would cost in campaign credits, before it is started, so a send that
 * would stop partway is a decision made up front rather than discovered afterwards. Every
 * attempted message spends a credit, so the shortfall is exact.
 */
export async function getCampaignSendPreflight(
  campaignId: string,
  orgId: string,
  sendToStatuses: CampaignParticipantStatus[],
  /**
   * The exact recipients a scoped resend names, when it names any.
   *
   * Counted instead of the statuses, because that is who the send will actually
   * go to — the fan-out lets an exact cohort override the status filter. Counting
   * the statuses here refused "Retry now" on a named recipient with "No
   * participants with the specified statuses" whenever the campaign happened to
   * have none in that status, which is a sentence about a filter the send was
   * not going to use.
   */
  participantIds?: string[],
): Promise<CampaignSendPreflight> {
  const [recipients, budget, messagesPerRecipient] = await Promise.all([
    participantIds?.length
      ? getCampaignParticipantCountByIds(campaignId, orgId, participantIds)
      : getCampaignParticipantCountByStatuses(campaignId, orgId, sendToStatuses),
    getCampaignCreditBudget(orgId),
    getCampaignMessagesPerRecipient(campaignId),
  ]);

  // A drip sends its whole sequence to each recipient, so the cost is the audience times
  // the stages.
  const messages = recipients * messagesPerRecipient;

  if (!budget.metered) {
    return { recipients, messagesPerRecipient, metered: false, exhausted: false, shortfall: 0 };
  }

  const remaining = budget.remaining ?? 0;

  return {
    recipients,
    messagesPerRecipient,
    metered: true,
    max: budget.planMax,
    used: budget.planUsed,
    packRemaining: budget.packRemaining,
    remaining,
    exhausted: budget.exhausted,
    shortfall: Math.max(messages - remaining, 0),
  };
}
