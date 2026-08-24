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
  updateCampaignStats,
  updateDripCampaignParticipant,
  updateDripCampaignStats,
} from "../../campaign.js";
import type { WaTemplateData, WaTemplateDefaultValues } from "../../types/dispatcher.types.js";
import dbPool from "../../../../utils/db.js";

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
  sourceIdentifier: string;
  dripCampaignId?: string;
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
  phone: string;
  sourceIdentifier: string;
}

export async function processParticipant(participant: Participant): Promise<void> {
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
      sourceIdentifier,
      dripCampaignId,
      dripCampaignParticipantId,
      teamId,
    } = participant;

    // Send campaign message using database connections only when needed
    await sendCampaignMessage({
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
        phone,
        sourceIdentifier,
      },
      dripCampaignId,
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
  dripCampaignId?: string;
  dripCampaignParticipantId?: string;
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
  dripCampaignId,
  dripCampaignParticipantId,
}: SendCampaignParams): Promise<void> {
  if (!contact.phone) {
    log.warn("Contact %o does not have a phone number", contact);
    return;
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
  await sendTemplateMessage(
    orgId,
    teamId,
    templateMessage,
    participantId,
    templateData,
    messageOptions,
    dripCampaignId,
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
  { accessToken, phoneId, campaignId, sourceIdentifier }: MessageOptions,
  dripCampaignId?: string,
  dripCampaignParticipantId?: string,
  category?: WaTemplateCategory,
): Promise<void> {
  // Sends and records in one call — including recording a rejection, which is
  // what the failure bookkeeping below reacts to.
  //
  // sendMetaMessage enforces the org's conversation allowance and signals a breach by
  // throwing. That is deliberately caught and folded into the normal failure result
  // here rather than propagating: this runs inside a BullMQ job, and a quota breach is
  // not transient — rethrowing would retry the job on a condition that cannot resolve
  // until the org upgrades or the cycle resets. The participant is marked FAILED with
  // the reason instead.
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
      dripStageId: dripCampaignParticipantId ?? null,
      templateData,
    },
  }).catch((error: unknown) => {
    if (error instanceof ConversationLimitError) {
      log.warn({ orgId, campaignId }, "Campaign send blocked — conversation limit reached");
      return { ok: false as const, error: error.message };
    }
    throw error;
  });

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
      return;
    }

    // Failure bookkeeping. These write to different tables, so they are
    // independent — but they share the one connection holding the transaction,
    // hence sequential rather than Promise.all.
    if (dripCampaignId && dripCampaignParticipantId) {
      await updateDripCampaignParticipant(
        dripCampaignParticipantId,
        {
          status: CampaignParticipantStatus.FAILED,
          errorMessage: data.error ?? null,
          sentAt: new Date(),
        },
        client,
      );
      await updateDripCampaignStats(dripCampaignId, "totalFailed", client);
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
    await updateCampaignStats(campaignId, "totalFailed", client);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    log.error(`Error in sendTemplateMessage: %o`, error);
    throw error;
  } finally {
    client.release();
  }
}
