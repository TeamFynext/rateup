import { log } from "../../logger.js";
import { CampaignParticipantStatus, WaTemplateCategory } from "../../types/enum.js";
import { createTemplateMessage } from "../../../../modules/meta/whatsapp/webhook/whatsapp.utils.js";
import {
  sendMetaMessage,
  type MetaSendResult,
} from "../../../../modules/meta/shared/metaMessage.service.js";
import { CampaignCreditsExhaustedError } from "../../../../modules/meta/whatsapp/webhook/whatsapp.auth.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { buildTemplateComponents } from "../../../../modules/meta/whatsapp/templates/templateComponents.js";
import { signFlowToken } from "../../../../modules/meta/whatsapp/flows/flowToken.js";
import {
  updateCampaignParticipant,
  updateCampaignSendStats,
  updateCampaignStats,
  updateDripCampaignParticipant,
  updateDripCampaignStats,
} from "../../campaign.js";
import type { WaTemplateData, WaTemplateDefaultValues } from "../../types/dispatcher.types.js";
import { classifyWaFailure, WaFailureClass } from "../../../../utils/waRetryableErrors.js";
import { isSendOutcomeUnknown } from "../../../../utils/graphError.js";
import { resolveCampaignAccessToken } from "../../accessTokenCache.js";
import dbPool from "../../../../utils/db.js";
import baseRedis from "../../../../utils/redisConnection.js";
import { incrementUsage } from "../../usageCounter.js";
import {
  isCampaignSendPaused,
  pauseCampaignForAccountIssue,
  pauseReasonForMetaError,
} from "../../../../modules/campaigns/campaignPause.service.js";
import { CampaignPauseReason } from "../../../../types/enums.js";

// Define proper interfaces
interface Participant {
  id: string;
  name: string;
  phone: string;
  customFields: Array<{
    slug: string;
    value: string;
  }>;
  data: WaTemplateData;
  orgId: string;
  defaultValues: WaTemplateDefaultValues;
  dynamicTags: string[];
  surveyTeamMapId: string;
  /**
   * Only on jobs enqueued before tokens were taken out of job data, which may
   * still be sitting delayed in Redis. New jobs resolve it by `phoneId`.
   */
  accessToken?: string;
  phoneId: string;
  contactId: string;
  campaignId: string;
  /** The send session this job belongs to; set by `enqueueCampaignMessages`. */
  campaignSendId: string;
  sourceIdentifier: string;
  /**
   * The drip *stage* this job is for. The job payload has always carried this
   * (`enqueueCampaignMessages` puts it there); the field this code read instead,
   * `dripCampaignId`, was never in the payload, so the drip failure branch below
   * was unreachable and drip-stage failures were booked against the participant.
   */
  dripStageId?: string;
  dripCampaignParticipantId?: string;
  teamId: string;
}

interface Contact {
  name: string;
  /** The send address: phone, or the BSUID of a customer whose phone is withheld. */
  phone: string;
  customFields: Array<{
    slug: string;
    value: string;
  }>;
}

interface MessageOptions {
  accessToken?: string;
  phoneId: string;
  contactId: string;
  campaignId: string;
  campaignSendId: string;
  phone: string;
  sourceIdentifier: string;
  idempotencyKey?: string;
}

/** The same wording the fan-out uses when the team has no credentials at all. */
const NO_CONNECTED_NUMBER = "This team has no connected WhatsApp number, so nothing could be sent.";

/**
 * What happened to one message, in the only terms the job wrapper cares about.
 *
 * `failureClass` is what decides whether BullMQ should try again: only
 * `TRANSIENT` earns a fast in-queue retry. Everything else — a frequency cap, a
 * dead number, an unclassified code — is either handled by the scheduled retry
 * engine hours later or not worth repeating at all.
 */
export interface DispatchOutcome {
  ok: boolean;
  failureClass?: WaFailureClass;
  /**
   * The campaign is paused because the account cannot send. The recipient was
   * left PENDING — nothing to retry in the queue, and nothing to book as a
   * failure; resuming the campaign sends to them.
   */
  paused?: boolean;
}

export interface ProcessParticipantOptions {
  /**
   * False while BullMQ still has attempts left. Failure bookkeeping is deferred
   * until the last one: the participant status and the three counters below are
   * written inside one transaction, and running that on attempt 1 of 3 would
   * count the same failure three times.
   */
  isFinalAttempt?: boolean;
  /**
   * The BullMQ job id. Makes the Graph call at-most-once per job, so a job that
   * stalls after sending and is rerun records the message instead of sending it
   * again (see `sendIdempotency.ts`).
   */
  idempotencyKey?: string;
}

export async function processParticipant(
  participant: Participant,
  options: ProcessParticipantOptions = {},
): Promise<DispatchOutcome> {
  try {
    const {
      id,
      name,
      phone,
      customFields,
      data,
      orgId,
      defaultValues,
      dynamicTags,
      surveyTeamMapId,
      accessToken,
      phoneId,
      contactId,
      campaignId,
      campaignSendId,
      sourceIdentifier,
      dripStageId,
      dripCampaignParticipantId,
      teamId,
    } = participant;

    // Send campaign message using database connections only when needed
    return await sendCampaignMessage({
      isFinalAttempt: options.isFinalAttempt ?? true,
      participantId: id,
      contact: {
        name,
        phone,
        customFields,
      },
      templateData: data,
      orgId,
      teamId,
      defaultValues,
      contactTags: dynamicTags,
      surveyTeamMapId,
      messageOptions: {
        accessToken,
        phoneId,
        contactId,
        campaignId,
        campaignSendId,
        phone,
        sourceIdentifier,
        idempotencyKey: options.idempotencyKey,
      },
      dripStageId,
      dripCampaignParticipantId,
    });
  } catch (error) {
    log.error({ err: error }, "Error processing participant");
    throw error;
  }
}

/**
 * Counts one call to Meta against the org's `messagesCount` — every call,
 * accepted or not, and once per attempt.
 *
 * Buffered in Redis and flushed by the `usageFlush` scheduled job (see
 * `usageCounter.ts`) rather than written here: `UsageStats` is one row per org,
 * and this used to be the first statement of the bookkeeping transaction below,
 * so every concurrent send of a campaign queued on that row's lock until the
 * previous send committed. Nothing enforces a limit against `messagesCount`, so
 * the few seconds it now lags are invisible.
 *
 * Only `messagesCount`: the monthly and annual message counters this used to
 * touch are not columns on `UsageStats` (see the schema history).
 */
async function countMetaCall(orgId: string) {
  await incrementUsage(baseRedis, orgId, "messagesCount");
}

interface SendCampaignParams {
  participantId: string;
  contact: Contact;
  templateData: WaTemplateData;
  orgId: string;
  teamId: string;
  defaultValues: WaTemplateDefaultValues;
  contactTags: string[];
  surveyTeamMapId: string;
  messageOptions: MessageOptions;
  dripStageId?: string;
  dripCampaignParticipantId?: string;
  isFinalAttempt: boolean;
}

async function sendCampaignMessage({
  participantId,
  contact,
  templateData,
  orgId,
  teamId,
  defaultValues,
  contactTags,
  surveyTeamMapId,
  messageOptions,
  dripStageId,
  dripCampaignParticipantId,
  isFinalAttempt,
}: SendCampaignParams): Promise<DispatchOutcome> {
  if (!contact.phone) {
    log.warn("Contact %o has no phone number or business-scoped user ID", contact);
    // Nothing to send and nothing a retry would fix.
    return { ok: false, failureClass: WaFailureClass.PERMANENT };
  }

  // The same builder the single-send path uses, so a template produces identical
  // components either way. The campaign's own copy skipped the SurveyTeamMap
  // lookup and sent the raw id from the template example, so short links in a
  // campaign pointed somewhere different from the same template sent by hand.
  const components = await buildTemplateComponents({
    dbTemplate: {
      data: templateData,
      defaultValues,
      whatsappSettingsPhoneId: messageOptions.phoneId,
    },
    orgId,
    phone: contact.phone,
    teamId,
    personalize: { contact, contactTags },
    includeFlowButton: Boolean(surveyTeamMapId),
    flowToken: surveyTeamMapId
      ? signFlowToken({
          surveyTeamMapId,
          orgId,
          phone: contact.phone,
          campaignParticipantId: participantId,
          campaignParticipantDripStageId: dripCampaignParticipantId,
        })
      : undefined,
  });
  // Create template message
  const templateMessage = createTemplateMessage(contact.phone, {
    name: templateData.name,
    language: { code: templateData.language },
    components,
  });
  // Send message and process response
  return await sendTemplateMessage(
    orgId,
    teamId,
    templateMessage,
    participantId,
    templateData,
    messageOptions,
    isFinalAttempt,
    dripStageId,
    dripCampaignParticipantId,
    templateData?.category,
  );
}

async function sendTemplateMessage(
  orgId: string,
  teamId: string,
  templateMessage: any,
  campaignParticipantId: string,
  templateData: WaTemplateData,
  {
    accessToken: jobAccessToken,
    phoneId,
    campaignId,
    campaignSendId,
    sourceIdentifier,
    idempotencyKey,
  }: MessageOptions,
  isFinalAttempt: boolean,
  dripStageId?: string,
  dripCampaignParticipantId?: string,
  category?: WaTemplateCategory,
): Promise<DispatchOutcome> {
  // A job already out of the queue when its campaign was paused, or fanned out by
  // an enqueue that raced the pause. Skipped before Meta is called, and the
  // recipient is left exactly as it was.
  if (await isCampaignSendPaused(campaignSendId)) {
    return { ok: false, paused: true };
  }

  // Sends and records in one call — including recording a rejection, which is
  // what the failure bookkeeping below reacts to.
  //
  // sendMetaMessage spends a campaign credit per attempt and signals none left by
  // throwing. That is deliberately caught rather than propagated: this runs inside a
  // BullMQ job, and a quota breach is not transient — rethrowing would retry the job on
  // a condition that cannot resolve until the org upgrades or the cycle resets. It is
  // not booked as this recipient's failure either: every recipient after this one would
  // be refused the same way, so the campaign is paused and they all stay PENDING.
  //
  // The token is no longer in the job (it sat in Redis once per recipient); it is
  // resolved by phone id through a short in-process cache. A job enqueued before
  // that change still carries one, and uses it.
  const accessToken =
    jobAccessToken || (phoneId ? await resolveCampaignAccessToken(orgId, phoneId) : null);
  const data: MetaSendResult | null = !accessToken
    ? { ok: false, error: NO_CONNECTED_NUMBER }
    : await sendMetaMessage({
        platform: PlatformType.WHATSAPP,
        orgId,
        to: templateMessage.to,
        payload: templateMessage as unknown as Record<string, unknown>,
        category,
        teamId,
        messageType: "CAMPAIGN",
        credentials: {
          accessToken,
          phoneId,
          sourceIdentifier,
          auth: "header",
        },
        campaign: {
          participantId: campaignParticipantId,
          // Despite the name, `handleWaMessages` files this against the per-stage
          // participant row (`campaignParticipantDripStageId`), not the stage.
          dripStageId: dripCampaignParticipantId ?? null,
          campaignSendId,
          templateData,
        },
        idempotencyKey,
      }).catch((error: unknown) => {
        if (error instanceof CampaignCreditsExhaustedError) return null;
        throw error;
      });
  // Whether this run actually reached Meta. Not when there was no token, and not
  // when an earlier run of this job had already sent the message.
  const calledMeta = Boolean(accessToken) && !data?.replayed;

  if (data === null) {
    log.warn({ orgId, campaignId }, "Campaign send blocked — campaign credits used up");
    // Meta was never called, so there is nothing to record — not even the usage
    // counter below.
    await pauseCampaignForAccountIssue(campaignId, CampaignPauseReason.CAMPAIGN_CREDIT_LIMIT);
    return { ok: false, paused: true };
  }

  // Meta was called, so the usage counter ticks — whatever happens next. It never
  // throws, so it cannot fail the bookkeeping below. Not for a run that never
  // reached Meta (no token, or a replay of a send an earlier run made).
  if (calledMeta) await countMetaCall(orgId);

  // An account-wide rejection from Meta. Same reasoning as the limit above, except
  // Meta *was* called, so the usage counter (above) still ticked.
  const pauseReason = data.ok ? null : pauseReasonForMetaError(data.detail?.code);
  if (pauseReason) {
    await pauseCampaignForAccountIssue(campaignId, pauseReason);
    return { ok: false, paused: true };
  }

  // An accepted send has nothing left to book here: its message row was written
  // by `sendMetaMessage`, and the usage count is buffered. No connection taken.
  if (data.ok) return { ok: true };

  // A timed-out send may have been delivered, so it is never retried in the
  // queue seconds later; it is booked as a failure the retry engine can weigh.
  // Otherwise the HTTP status goes along with the code, so an HTML 502 or an
  // empty 429 — no Graph code at all — reads as transient, not permanent.
  const failureClass = isSendOutcomeUnknown(data.detail)
    ? WaFailureClass.RETRY_LATER
    : classifyWaFailure(data.detail?.code, data.detail?.httpStatus);

  // Deferred while BullMQ still has attempts left. `countMetaCall` above is not
  // deferred, deliberately: every call to Meta is a call to Meta, whether or not
  // it succeeded.
  if (!isFinalAttempt && failureClass === WaFailureClass.TRANSIENT) {
    return { ok: false, failureClass };
  }

  // The send already happened; this records its outcome atomically. Raw `pg`
  // rather than `prisma.$transaction`: Prisma gave up waiting for a free
  // connection with P2028 under campaign load, losing the bookkeeping for every
  // send in a real campaign. See `src/utils/db.ts`.
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");

    // Failure bookkeeping. These write to different tables, so they are
    // independent — but they share the one connection holding the transaction,
    // hence sequential rather than Promise.all.
    if (dripStageId && dripCampaignParticipantId) {
      await updateDripCampaignParticipant(
        dripCampaignParticipantId,
        {
          status: CampaignParticipantStatus.FAILED,
          errorMessage: data.error ?? null,
          sentAt: new Date(),
        },
        client,
      );
      await updateDripCampaignStats(dripStageId, "totalFailed", client);
    } else {
      await updateCampaignParticipant(
        campaignParticipantId,
        {
          status: CampaignParticipantStatus.FAILED,
          errorMessage: data.error ?? null,
          sentAt: new Date(),
        },
        client,
      );
    }
    // Both branches also bump the campaign-level total. A drip stage's counters
    // are a breakdown *within* the campaign, not an alternative to it — this is
    // the same shape `bulkUpdateStatuses` uses, where a drip message increments
    // `CampaignStats` by campaignId and `CampaignDripStage` by stage id
    // independently. Booking the stage total only would leave a drip campaign's
    // Overview showing zero failures.
    await updateCampaignStats(campaignId, "totalFailed", client);

    // Send-time failures never reach the status consumer: the WaMessage row is
    // written with a NULL messageId, so `WHERE wm."messageId" = ANY(...)` can
    // never match it. The per-attempt failure count has to be booked here or it
    // is lost entirely.
    await updateCampaignSendStats(campaignSendId, "totalFailed", client);

    await client.query("COMMIT");
    return { ok: false, failureClass };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    log.error({ err: error }, "Error in sendTemplateMessage");
    throw error;
  } finally {
    client.release();
  }
}
