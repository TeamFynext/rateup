import { PlatformType } from "../../../../generated/prisma/enums.js";
import { WaTemplateCategory } from "../../../types/enums.js";
import { graphApiErrorDetail } from "../../../utils/graphError.js";
import { log } from "../../../utils/logger.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { getWaMessageByMessageId } from "../inbox/message/wamessage.service.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { assertWithinConversationLimit } from "../whatsappSurvey/wasurvey.auth.js";
import { getMetaChannel, type MetaChannelContext, type MetaCredentials } from "./metaChannels.js";

/**
 * The one way a message leaves this system for Meta.
 *
 * Before this existed the same job was written four times — the API's WhatsApp
 * send, the campaign worker's, the ad-hoc processor's and nine Instagram
 * senders — and each disagreed about failure. The Instagram senders logged and
 * rethrew, so a rejected send left nothing in the database at all; the API's
 * recorded the failure twice; the worker's used a second HTTP client and a
 * second writer. Every one of those was a bug found by reading, not by an alert.
 *
 * The rule here: a send is recorded exactly once, whether Meta accepted it or
 * not, and the reason is stored on the message (`WaMessage.logs` /
 * `errorMessage`) because there is nowhere else for it to live.
 */

export interface MetaSendInput extends MetaChannelContext {
  platform: PlatformType;
  /**
   * Recipient: a phone number (WhatsApp), igsId (Instagram) or psid (Messenger).
   * May be omitted for an Instagram private reply, which is addressed to a
   * comment — the contact is then taken from Meta's `recipient_id`.
   */
  to?: string;
  /** The channel-native message body, built by the caller. */
  payload: Record<string, unknown>;

  // ── how the message is filed ──────────────────────────────────────────────
  userName?: string;
  userId?: string;
  teamId?: string | null;
  messageType?: "INBOX" | "TEMPLATE" | "CAMPAIGN" | "AUTOMATED" | "FLOW";
  isAutomated?: boolean;
  externalApi?: boolean;
  campaign?: {
    participantId: string;
    dripStageId?: string | null;
    templateData?: unknown;
    /** The send session (initial send or a specific retry) this message is part of. */
    campaignSendId?: string | null;
  };

  /**
   * Credentials already in hand. The campaign fan-out decrypts the org's access
   * token once for a whole batch (see `campaignEnqueue.processor`), so making it
   * re-resolve per message would undo that.
   */
  credentials?: MetaCredentials;

  /**
   * Check the org's conversation quota before sending. Off by default so this
   * does not silently start gating paths that never gated (campaign sends);
   * the inbox and Instagram paths that check today pass `true`.
   */
  /**
   * Defaults to TRUE: an outbound send is gated by the org's conversation allowance
   * unless a caller explicitly opts out. This used to default to false — the opposite
   * polarity to sendMessage's `skipConversationLimit` — which meant campaign fan-out
   * and ad-hoc sends through this path were silently ungated.
   */
  enforceConversationLimit?: boolean;
}

export interface MetaSendResult {
  ok: boolean;
  /** Meta's id for the message, when it accepted one. */
  messageId?: string;
  /** Human-readable reason, suitable for showing to an agent. */
  error?: string;
  detail?: WaGraphApiErrorDetail;
}

/**
 * Meta's own wording where it gave any, and something honest where it did not.
 *
 * `error_user_msg` is the copy Meta intends to be shown to a person, so it wins;
 * it is not in the declared shape (the type carries an index signature for the
 * fields that vary by failure), hence the narrowing.
 */
export function metaErrorMessage(detail: WaGraphApiErrorDetail | undefined): string {
  const userMessage =
    typeof detail?.error_user_msg === "string" ? detail.error_user_msg : undefined;
  return (
    userMessage ??
    detail?.message ??
    detail?.error_data?.details ??
    (detail?.code ? `Graph error ${detail.code}` : "Failed to send message")
  );
}

/** Waits between attempts to store a message Meta has already accepted. */
const RECORD_RETRY_DELAYS_MS = [500, 2000, 5000];

export async function sendMetaMessage(input: MetaSendInput): Promise<MetaSendResult> {
  const {
    platform,
    orgId,
    to,
    payload,
    category,
    userName,
    userId,
    teamId = null,
    messageType = "INBOX",
    isAutomated = false,
    externalApi = false,
    campaign,
    enforceConversationLimit = true,
  } = input;

  const channel = getMetaChannel(platform);
  if (!channel) {
    // WEBCHAT and INTERNAL are stored, never sent to Meta.
    return { ok: false, error: `No Meta channel for platform ${platform}` };
  }

  // Throws ConversationLimitError, which callers turn into a 4xx. Deliberately
  // not converted to a result: it is a quota decision, not a send outcome.
  if (enforceConversationLimit) await assertWithinConversationLimit(orgId);

  const credentials = input.credentials ?? (await channel.resolveCredentials(input));
  if (!credentials) {
    const error = `No ${platform} credentials configured for org ${orgId}`;
    log.error({ orgId, platform, sourceIdentifier: input.sourceIdentifier }, error);
    return { ok: false, error };
  }

  const record = async (
    recipient: string,
    messageId: string | undefined,
    failed: boolean,
    logs?: WaGraphApiErrorDetail,
  ) => {
    const store = () =>
      handleWaMessages(
        "send",
        payload,
        recipient,
        orgId,
        platform,
        credentials.sourceIdentifier,
        userName,
        messageId,
        userId,
        failed,
        teamId,
        messageType,
        isAutomated,
        externalApi,
        logs ?? {},
        campaign,
      );

    let lastError: unknown;
    try {
      await store();
      return;
    } catch (err) {
      lastError = err;
    }

    // The send already happened. Losing the record is bad — for a campaign it
    // is a participant stuck in PENDING and every delivery receipt for the
    // message dead-lettered — but reporting a delivered message as failed is
    // worse, so this never throws. It does try again: at campaign concurrency
    // one store in thousands fails on something transient, and the receipts are
    // already on their way. A rejected send has no message id to check against,
    // so it gets the one attempt — a retry could file the same rejection twice.
    if (messageId) {
      for (const delayMs of RECORD_RETRY_DELAYS_MS) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        try {
          // The first attempt may have written the row and failed afterwards.
          if (await getWaMessageByMessageId(messageId)) return;
          await store();
          log.warn({ orgId, platform, messageId }, "Message stored on retry");
          return;
        } catch (err) {
          lastError = err;
        }
      }
    }

    log.error(
      { err: lastError, orgId, platform, messageId },
      "Message was sent but could not be stored",
    );
  };

  try {
    const usesQueryToken = credentials.auth === "query";
    const response = await callMetaApi(
      channel.buildPath(credentials, { orgId, category }),
      "POST",
      usesQueryToken ? undefined : credentials.accessToken,
      payload,
      usesQueryToken ? { params: { access_token: credentials.accessToken } } : {},
    );

    const messageId = channel.extractMessageId(response.data);
    const recipient = to || channel.extractRecipientId?.(response.data);
    if (recipient) {
      await record(recipient, messageId, false);
    } else {
      // Sent, but with nobody to file it against — worth knowing about, not worth
      // failing the send for.
      log.warn({ orgId, platform, messageId }, "Sent a Meta message with no recipient to record");
    }
    return { ok: true, messageId };
  } catch (err) {
    const detail = graphApiErrorDetail(err);
    log.error(
      { err, orgId, platform, to },
      err instanceof GraphApiError ? "Meta rejected the message" : "Meta send failed",
    );

    // Recorded even though it never left: an agent looking at the thread needs to
    // see the attempt and why it failed, and a campaign needs the participant
    // marked against something. A failed private reply has no recipient to file
    // against, so there is nothing to write.
    if (to) await record(to, undefined, true, detail);
    return { ok: false, error: metaErrorMessage(detail), detail };
  }
}
