import { PlatformType } from "../../../../generated/prisma/enums.js";
import { WaTemplateCategory } from "../../../types/enums.js";
import { graphApiErrorDetail } from "../../../utils/graphError.js";
import { log } from "../../../utils/logger.js";
import { metaSendDuration, metaSendErrors } from "../../../utils/metrics.js";
import { classifyWaFailure } from "../../../utils/waRetryableErrors.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { getWaMessageByMessageId } from "../inbox/message/wamessage.service.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { enqueueWaMessageRecord } from "../../../workers/bullmq/queues/whatsapp.queue.js";
import { assertCampaignCredit, assertCanMessageContact } from "../whatsappSurvey/wasurvey.auth.js";
import { getMetaChannel, type MetaChannelContext, type MetaCredentials } from "./metaChannels.js";
import { getSentMessageId, markMessageSent } from "./sendIdempotency.js";

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
   * Credentials already in hand. The campaign dispatcher keeps decrypted tokens
   * in a short in-process cache (`workers/shared/accessTokenCache.ts`), so making
   * it re-resolve per message would undo that.
   */
  credentials?: MetaCredentials;

  /**
   * Enforce the plan before sending: a campaign send spends a campaign credit, anything
   * else must not add a new active contact past the allowance. Defaults to true.
   */
  enforcePlanLimits?: boolean;

  /**
   * Makes the send at-most-once per key: once Meta has accepted a message under
   * this key, a later call with it records that message (if it is not stored
   * yet) instead of sending again. The campaign dispatcher passes its BullMQ job
   * id, so a job that stalls after sending and is rerun does not deliver twice.
   */
  idempotencyKey?: string;
}

export interface MetaSendResult {
  ok: boolean;
  /** Meta's id for the message, when it accepted one. */
  messageId?: string;
  /**
   * Meta was not called: an earlier call with the same `idempotencyKey` had
   * already sent this message. Nothing was spent this time.
   */
  replayed?: boolean;
  /** Human-readable reason, suitable for showing to an agent. */
  error?: string;
  detail?: WaGraphApiErrorDetail;
  recipientId?: string;
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

/**
 * Waits between in-process attempts to store an accepted message — the
 * fallback used only when the record queue itself cannot be reached.
 */
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
    enforcePlanLimits = true,
    idempotencyKey,
  } = input;

  const channel = getMetaChannel(platform);
  if (!channel) {
    // WEBCHAT and INTERNAL are stored, never sent to Meta.
    return { ok: false, error: `No Meta channel for platform ${platform}` };
  }

  // Read before the plan check, which spends a campaign credit: a rerun of a
  // message that already went out must not pay for it twice either.
  const priorMessageId = idempotencyKey ? await getSentMessageId(idempotencyKey) : null;

  // Throws ActiveContactLimitError / CampaignCreditsExhaustedError, which callers turn
  // into a 4xx or a campaign pause. Not converted to a result: it is a quota decision,
  // not a send outcome.
  if (enforcePlanLimits && !priorMessageId) {
    if (campaign) await assertCampaignCredit(orgId);
    else await assertCanMessageContact(orgId, to ? { platform, customerId: to } : undefined);
  }

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
    // worse, so this never throws. A rejected send has no message id to check
    // against, so it gets the one attempt — a retry could file the same
    // rejection twice.
    if (!messageId) {
      log.error({ err: lastError, orgId, platform }, "Rejected send could not be recorded");
      return;
    }

    // An accepted message is handed to the record queue, which retries with real
    // backoff from a different process. Retrying here, seconds apart, in the
    // same process whose pool just timed out is what lost 2,800 rows on
    // 2026-09-12: the queue exists so that cannot repeat.
    try {
      await enqueueWaMessageRecord({
        payload,
        recipient,
        orgId,
        platform,
        sourceIdentifier: credentials.sourceIdentifier,
        userName,
        messageId,
        userId,
        teamId,
        messageType,
        isAutomated,
        externalApi,
        campaign,
      });
      log.warn(
        { err: lastError, orgId, platform, messageId },
        "Message store failed; queued for recording",
      );
      return;
    } catch (queueErr) {
      log.error({ err: queueErr, orgId, platform, messageId }, "Could not queue message record");
    }

    // Redis is down too. Last resort: the old in-process retries.
    for (const delayMs of RECORD_RETRY_DELAYS_MS) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      try {
        // The first attempt may have written the row and failed afterwards. The
        // read is an early exit; a racing store is caught by the unique
        // `messageId` index, and `store()` then resolves to null — done either way.
        if (await getWaMessageByMessageId(messageId)) return;
        if ((await store()) === null) return;
        log.warn({ orgId, platform, messageId }, "Message stored on retry");
        return;
      } catch (err) {
        lastError = err;
      }
    }

    log.error(
      { err: lastError, orgId, platform, messageId },
      "Message was sent but could not be stored",
    );
  };

  if (priorMessageId) {
    // The earlier run may have died before, during or after storing it. Only the
    // first of those leaves anything to do.
    log.warn(
      { orgId, platform, idempotencyKey, messageId: priorMessageId },
      "Message already sent under this key; recording instead of sending again",
    );
    if (to && !(await getWaMessageByMessageId(priorMessageId))) {
      await record(to, priorMessageId, false);
    }
    return { ok: true, messageId: priorMessageId, replayed: true };
  }

  // Times the Graph call alone; the store afterwards has its own latency story.
  let endSendTimer: ((labels: { outcome: string }) => void) | undefined =
    metaSendDuration.startTimer({ platform });
  try {
    const usesQueryToken = credentials.auth === "query";
    const response = await callMetaApi(
      channel.buildPath(credentials, { orgId, category }),
      "POST",
      usesQueryToken ? undefined : credentials.accessToken,
      payload,
      usesQueryToken ? { params: { access_token: credentials.accessToken } } : {},
    );
    endSendTimer({ outcome: "ok" });
    endSendTimer = undefined;

    const messageId = channel.extractMessageId(response.data);
    // Before recording, which is the slow part and so the likeliest place for a
    // stalled job to die.
    if (idempotencyKey && messageId) await markMessageSent(idempotencyKey, messageId);
    const recipient = to || channel.extractRecipientId?.(response.data);
    if (recipient) {
      await record(recipient, messageId, false);
    } else {
      // Sent, but with nobody to file it against — worth knowing about, not worth
      // failing the send for.
      log.warn({ orgId, platform, messageId }, "Sent a Meta message with no recipient to record");
    }
    return { ok: true, messageId, recipientId: recipient };
  } catch (err) {
    const detail = graphApiErrorDetail(err);
    endSendTimer?.({ outcome: "error" });
    metaSendErrors.inc({
      platform,
      code: detail.code === undefined || detail.code === null ? "none" : String(detail.code),
      class: classifyWaFailure(detail.code, detail.httpStatus),
    });
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
