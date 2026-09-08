import { getConversationBudget } from "../subscription/conversationBudget.js";
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
   * Messages per recipient — a drip's stage count, 1 for a broadcast. The
   * allowance is spent per message, so a 3-stage drip to 50 people is 150.
   */
  messagesPerRecipient: number;
  /** False when the plan is not metered — nothing to warn about. */
  metered: boolean;
  /** The conversation allowance and what is left of it, when metered. */
  max?: number;
  used?: number;
  remaining?: number;
  isAnnual: boolean;
  /** True when the allowance is already spent: nothing would be delivered. */
  exhausted: boolean;
  /** Recipients beyond what the allowance covers. Zero when the campaign fits. */
  shortfall: number;
}

/**
 * What a campaign would cost against the conversation allowance, before it is started.
 *
 * A campaign that outruns the allowance used to fail one message at a time, deep in the
 * dispatcher: the sender saw "Campaign send blocked — conversation limit reached" in a
 * worker log, and the customer saw some recipients get the message and the rest silently
 * not. Telling them up front is the whole point — 50 recipients against 45 conversations
 * is a decision to make before sending, not a partial send to discover afterwards.
 *
 * `shortfall` is an UPPER BOUND on what would be lost, and deliberately so. Conversations
 * are 24h windows, not messages: a recipient the org is already in an open window with
 * costs nothing extra, so a campaign of 50 may spend anywhere from 0 to 50. Overstating
 * the risk is the safe direction for a warning — understating it would let someone start
 * a send that then stops halfway.
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
    getConversationBudget(orgId),
    getCampaignMessagesPerRecipient(campaignId),
  ]);

  // A drip sends its whole sequence to each recipient, so the cost is the
  // audience times the stages. Counting the audience alone told someone with 60
  // conversations left that a 3-stage drip to 50 people fit — it needs 150, and
  // the send would have stopped two thirds of the way through the first stage.
  const messages = recipients * messagesPerRecipient;

  if (!budget.metered) {
    return {
      recipients,
      messagesPerRecipient,
      metered: false,
      isAnnual: budget.isAnnual,
      exhausted: false,
      shortfall: 0,
    };
  }

  const remaining = budget.remaining ?? 0;

  return {
    recipients,
    messagesPerRecipient,
    metered: true,
    max: budget.max,
    used: budget.used,
    remaining,
    isAnnual: budget.isAnnual,
    exhausted: remaining === 0,
    shortfall: Math.max(messages - remaining, 0),
  };
}
