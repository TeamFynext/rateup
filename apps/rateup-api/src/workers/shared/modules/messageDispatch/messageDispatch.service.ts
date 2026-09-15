import type { PoolClient } from "pg";

import { log } from "../../logger.js";
import { CampaignParticipantStatus, WaTemplateCategory } from "../../types/enum.js";
import { createTemplateMessage } from "../../../../modules/whatsapp/whatsappSurvey/wasurvey.utils.js";
import { sendMetaMessage } from "../../../../modules/whatsapp/meta/metaMessage.service.js";
import { ConversationLimitError } from "../../../../modules/whatsapp/whatsappSurvey/wasurvey.auth.js";
import { PlatformType } from "../../../../../generated/prisma/enums.js";
import { buildTemplateComponents } from "../../../../modules/whatsapp/messageTemplates/templateComponents.js";
import { signFlowToken } from "../../../../modules/whatsapp/flows/flowToken.js";
import {
  updateCampaignParticipant,
  updateCampaignSendStats,
  updateCampaignStats,
  updateDripCampaignParticipant,
  updateDripCampaignStats,
} from "../../campaign.js";
import type { WaTemplateData, WaTemplateDefaultValues } from "../../types/dispatcher.types.js";
import { classifyWaFailure, WaFailureClass } from "../../../../utils/waRetryableErrors.js";
import dbPool from "../../../../utils/db.js";
import {
  isCampaignSendPaused,
  pauseCampaignForAccountIssue,
  pauseReasonForMetaError,
} from "../../../../modules/campaign/campaignPause.service.js";
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
  accessToken: string;
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
  phone: string;
  customFields: Array<{
    slug: string;
    value: string;
  }>;
}

interface MessageOptions {
  accessToken: string;
  phoneId: string;
  contactId: string;
  campaignId: string;
  campaignSendId: string;
  phone: string;
  sourceIdentifier: string;
}

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
      },
      dripStageId,
      dripCampaignParticipantId,
    });
  } catch (error) {
    log.error(`Error processing participant: %o`, error);
    throw error;
  }
}

export async function updateWaMonthlyStat(orgId: string, client: PoolClient) {
  try {
    /**
     * `messagesCount` only — the monthly and annual message counters this used
     * to touch (`monthlyMessagesCount`, `annualMessageCount`) are not columns
     * on `UsageStats` and, going by the schema history, never came back after
     * the counters were reorganised. Postgres rejected the whole statement with
     * 42703, so every campaign send counted *nothing*: the increment that does
     * exist was lost along with the two that do not.
     *
     * This mirrors the rest of rateup-api, which increments exactly this column
     * for a WhatsApp send (`updateMonthlyStat` in `stats.service.ts`).
     *
     * If monthly or annual message caps are wanted, the columns need adding to
     * `prisma/schema.prisma` first — `UsageStats` keeps monthly/annual pairs
     * only for templates and conversations today.
     */
    return await client.query(
      `UPDATE "UsageStats" SET "messagesCount" = "messagesCount" + 1 WHERE "orgId" = $1`,
      [orgId],
    );
  } catch (error) {
    log.error(`Error in updateWaMonthlyStat: %o`, error);
    throw error;
  }
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
    log.warn("Contact %o does not have a phone number", contact);
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
  { accessToken, phoneId, campaignId, campaignSendId, sourceIdentifier }: MessageOptions,
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
  // sendMetaMessage enforces the org's conversation allowance and signals a breach by
  // throwing. That is deliberately caught rather than propagated: this runs inside a
  // BullMQ job, and a quota breach is not transient — rethrowing would retry the job on
  // a condition that cannot resolve until the org upgrades or the cycle resets. It is
  // not booked as this recipient's failure either: every recipient after this one would
  // be refused the same way, so the campaign is paused and they all stay PENDING.
  const data = await sendMetaMessage({
    platform: PlatformType.WHATSAPP,
    orgId,
    to: templateMessage.to,
    payload: templateMessage as unknown as Record<string, unknown>,
    category,
    teamId,
    messageType: "CAMPAIGN",
    // Decrypted once for the whole batch by the enqueue processor; resolving
    // again here would be a query and a decrypt per message.
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
  }).catch((error: unknown) => {
    if (error instanceof ConversationLimitError) return null;
    throw error;
  });

  if (data === null) {
    log.warn({ orgId, campaignId }, "Campaign send blocked — conversation limit reached");
    // Meta was never called, so there is nothing to record — not even the usage
    // counter below.
    await pauseCampaignForAccountIssue(campaignId, CampaignPauseReason.CONVERSATION_LIMIT);
    return { ok: false, paused: true };
  }

  // An account-wide rejection from Meta. Same reasoning as the limit above, except
  // Meta *was* called, so the usage counter still ticks.
  const pauseReason = data.ok ? null : pauseReasonForMetaError(data.detail?.code);
  if (pauseReason) {
    // One statement, so no transaction and no held connection: the pause walks
    // the queue, and holding a pooled connection open across that is how P2028
    // started.
    await dbPool.query(
      `UPDATE "UsageStats" SET "messagesCount" = "messagesCount" + 1 WHERE "orgId" = $1`,
      [orgId],
    );
    await pauseCampaignForAccountIssue(campaignId, pauseReason);
    return { ok: false, paused: true };
  }

  // The send already happened; this records its outcome atomically. Raw `pg`
  // rather than `prisma.$transaction`: this runs at concurrency 250 and Prisma
  // gave up waiting for a free connection with P2028, losing the bookkeeping for
  // every send in a real campaign. See `src/utils/db.ts`.
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");

    await updateWaMonthlyStat(orgId, client);

    if (data.ok) {
      await client.query("COMMIT");
      return { ok: true };
    }

    const failureClass = classifyWaFailure(data.detail?.code);

    // Deferred while BullMQ still has attempts left. `updateWaMonthlyStat` above
    // is not deferred, deliberately: every call to Meta is a call to Meta,
    // whether or not it succeeded.
    if (!isFinalAttempt && failureClass === WaFailureClass.TRANSIENT) {
      await client.query("COMMIT");
      return { ok: false, failureClass };
    }

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
    log.error(`Error in sendTemplateMessage: %o`, error);
    throw error;
  } finally {
    client.release();
  }
}
