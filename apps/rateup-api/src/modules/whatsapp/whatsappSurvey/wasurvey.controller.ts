import { FastifyRequest, FastifyReply } from "fastify";
import {
  WA_SUBSCRIBE_STATUS,
  WaParsedMessage,
  assignChat,
  convertNodeToWhatsAppMessage,
  createReplyButtonsMessage,
  createTemplateMessage,
  flowResponseStrings,
  getEventType,
  getMessageObject,
  handlePaymentConfirmation,
  isMetaAiOriginated,
  parseMessage,
  parseStartMessage,
  parseToWhatsAppFormat,
  parseWaJoinMessage,
} from "./wasurvey.utils.js";
import {
  aibotNodeCompletion,
  getAiBotActiveStatus,
  handleLeadGen,
  handleMessageStatusUpdate,
  sendMessage,
  sendTextMessage,
  setAiBotActiveStatus,
} from "./wasurvey.service.js";
import {
  CampaignParticipantStatus,
  SurveyType,
  WaEvent,
  WaTemplateStatus,
  WaTemplateComponentType,
  SubscriptionFeaturePathName,
  WaTemplateSupportedFormats,
  WhatsappSettingsStatus,
} from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import {
  getTemplateWithHSMId,
  updateTemplateInDb,
  getDbTemplate,
} from "../messageTemplates/wa_templates.service.js";
import {
  getWaSettingsByPhoneId,
  MetaAsset,
  updateWaSettingsStatusByWabaId,
} from "../settings/wa_settings.service.js";
import {
  WaMessageBody,
  WaMessageTypes,
  WaReceiveMessageBody,
  type OutgoingTemplateComponent,
  type WaSendMessageBody,
} from "../../../types/whatsapp.types.js";
import type {
  WaAccountUpdate,
  WaPhoneNumberNameUpdate,
  WaStandbyChangeValue,
  WaTemplateCategoryChange,
  WaTemplateSendComponent,
  WaTemplateStatusChange,
} from "../../../types/whatsapp.types.js";
import { WaAutomationProgressStatus } from "../../../../generated/prisma/enums.js";
import {
  addWaMessageCampaignParticipantMap,
  updateCampaignParticipant,
} from "../../campaign/campaignParticipants/campaignParticipants.service.js";
import prisma from "../../../utils/prisma.js";
import { updateStartedSurvey, updateVisitedSurvey } from "../../survey/survey.service.js";
import {
  getFlowWithSurveyTeamMapIdsWithDbFlowId,
  getSurveyTeamMapWithFlow,
  handleStaticFlowReply,
  sendFlow,
} from "../flows/flow.service.js";
import { signFlowToken } from "../flows/flowToken.js";
import { checkAndExecuteRuleByTriggerEvent } from "../automatedReply/wa_automatedReply.utils.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { recordMetaAiTokenUsage } from "../../metaAgent/metaAgent.usage.js";
import {
  metaTimestampToDate,
  resolveHandoverOwner,
  setMetaAgentThreadOwner,
  type WaMessagingHandoverValue,
} from "../../metaAgent/metaAgent.threadOwner.js";
import {
  CampaignParticipant,
  Contact,
  MetaAgentThreadOwner,
  PlatformType,
  WhatsappSettings,
} from "../../../../generated/prisma/client.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import { getFlowIdFromTemplateComponents } from "../messageTemplates/wa_templates.utils.js";
import {
  getContactByPhoneNumberAndOrgId,
  getOrCreateContactByPhone,
  handleContactConsent,
} from "../../contact/contact.service.js";
import { getOrgById } from "../../org/org.services.js";
import { checkConversationLimitAvailable } from "./wasurvey.auth.js";
import { updateMonthlyStat } from "../../stats/stats.service.js";
import { getLatestStatus } from "../../campaign/campaign.service.js";
import {
  getLoyaltyWaCommandByRequestMessage,
  handleLoyaltyRedeemInteraction,
  handleLoyaltyWaCommand,
} from "../../loyalty/settings/settings.service.js";
import { createJWT } from "../../../utils/jwt.js";
import { getAIResponseForQuery, getChatbotDetails } from "../../chatbot/chatbot.service.js";
import { sendTemplateToUserCore } from "../messageTemplates/wa_templates.controller.js";
import { NodeTypeMap, TypedNode } from "./node-types.js";
import type {
  AutomationEdge,
  AutomationGraph,
  AutomationNode,
  AutomationWithGraph,
  TemplateComponent,
  TemplateComponentParameter,
} from "./node-types.js";
import { logAutomationAction, findRecentAutomation } from "./automation-logger.utils.js";
import {
  getAutomatedReplyById,
  verifyAutomationTriggerLimit,
} from "../automatedReply/wa_automatedReply.service.js";
import { handleWaOrderfromCatalog } from "../catalog/catalog.service.js";
import { getTokensForContactAudience } from "../../mobileNotification/mobile.service.js";
import {
  assignWaMessageToUser,
  getAssignedUsersCountForContactByTeam,
  getWaMessageByMessageId,
  markWaMessageAsDeleted,
} from "../inbox/message/wamessage.service.js";
import { getUserIdsByTeamId } from "../../user/user.service.js";
import { getTeamIdsByUserId } from "../../team/team.service.js";
import {
  createCustomerAccount,
  releasePendingSignupBonusByPhone,
} from "../../loyalty/accounts/account.service.js";
import { getLoyaltyProgramByOrg } from "../../loyalty/program/program.service.js";
import { isJoinTap } from "../../loyalty/loyaltyEventTemplates.js";
import { LoyaltyChannel } from "../../loyalty/messaging/channelIds.js";
import { replySystem, type InboundReplyContext } from "../../loyalty/messaging/reply.js";
import { sendNewCustomerWelcomeIfDue } from "../../loyalty/newCustomerWelcome.js";
import { sendMemberCardIfDue } from "../../loyalty/accounts/memberCard.service.js";
import { LoyaltyTemplateTypes } from "../../../types/enums.js";
import { notificationQueue, pausedAutomationQueue } from "../../../workers/bullmq/queues/index.js";
import { enqueueWebhookDispatch } from "../../webhook/webhook.service.js";
import { sendViaWstoOrgHandler } from "../../org/ws/org.ws.controller.js";
import { channelDigits } from "../../../utils/channelIdentifier.js";

// TODO: add as fastify schema
interface subscribeQuery {
  "hub.mode": string;
  "hub.verify_token": string;
  "hub.challenge": string;
}
export async function webhookSubscribeHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = request.query as subscribeQuery;
    if (
      query["hub.mode"] === "subscribe" &&
      query["hub.verify_token"] === process.env.wa_webhook_password
    ) {
      log.trace("Webhook subscription successful");
      reply.code(200).send(query["hub.challenge"]);
    } else {
      reply.code(403).send("Error, wrong validation token");
    }
  } catch (e) {
    log.error(e);
    reply.code(500);
  }
}

// TODO: handle multiple changes (changes.length > 1)
// TODO: Check for usable types in whatsapp sdk (discontinued project)
export async function whatsappEventHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as WaMessageBody;
    log.trace("WaEvent => %o", body); // Log the entire event payload

    const eventType = getEventType(body);
    if (!eventType) {
      return;
    }
    reply.code(200).send();
    switch (eventType) {
      case "captured":
        await handleCapturedEvent(body);
        break;

      case WaEvent.Message:
        await handleMessageEvent(body);
        break;

      case WaEvent.TemplateStatusChange:
        await handleTemplateStatusChange(body);
        break;
      case WaEvent.TemplateCategoryUpdate:
        await handleTemplateCategoryChange(body);
        break;

      case WaEvent.DELIVERED:
      case WaEvent.READ:
      case WaEvent.FAILED:
      case WaEvent.SENT:
        await handleMessageStatusEvent(body, eventType);
        break;

      case WaEvent.LEADGEN:
        await handleLeadGen(body);
        break;
      case WaEvent.ACCOUNT_UPDATE:
        await handleAccountUpdateEvent(body);
        break;

      case WaEvent.PhoneNumberNameUpdate:
        await handlePhoneNumberNameUpdateEvent(body);
        break;

      case WaEvent.SMBMessageEchoes:
        await handleSMBMessageEchoes(body);
        break;

      case WaEvent.Standby:
        await handleStandbyEvent(body);
        break;

      case WaEvent.MessagingHandovers:
        await handleMessagingHandoversEvent(body);
        break;

      default:
        log.warn("Unhandled event type: %s", eventType);
    }
  } catch (error) {
    log.error({ err: error }, "Error in whatsappEventHandler");
  }
}

// Utility: Wrap async functions to handle errors
async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  errorHandler: (error: unknown) => void,
): Promise<T | void> {
  try {
    return await operation();
  } catch (error) {
    errorHandler(error);
  }
}

// Handler: Payment confirmation for captured events
async function handleCapturedEvent(body: WaMessageBody) {
  const promises = (body.entry || []).flatMap((entry) =>
    (entry.changes || []).flatMap((change) =>
      ((change.value as WaReceiveMessageBody)?.statuses || [])
        .filter(
          (status): status is typeof status & { payment: { reference_id: string } } =>
            !!status.payment?.reference_id,
        )
        .map((status) =>
          safeAsyncOperation(
            () => handlePaymentConfirmation(status.recipient_id, status.payment.reference_id),
            (error) =>
              log.error(
                { err: error },
                `Error handling payment confirmation for recipient_id ${status.recipient_id}`,
              ),
          ),
        ),
    ),
  );

  await Promise.all(promises);
}

// Handler: Manage incoming WhatsApp messages
async function handleMessageEvent(body: WaMessageBody, options: InboundOptions = {}) {
  log.trace("messageObject => %o", getMessageObject(body));

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const phoneId = (change.value as WaReceiveMessageBody)?.metadata?.phone_number_id;
      const waSettings = await getWaSettingsByPhoneId(phoneId);

      if (!waSettings) {
        log.error("WaSettings not found for phone_id: %s", phoneId);
        continue;
      }

      await safeAsyncOperation(
        () => whatsappMessageHandler(waSettings, body, options),
        (error) => {
          log.error({ err: error }, "Error processing WhatsApp message for phone_id %s", phoneId);
        },
      );
    }
  }
}

// Handler: Manage SMB Message Echoes
async function handleSMBMessageEchoes(body: WaMessageBody) {
  log.trace("handleSMBMessageEchoes => %o", body);

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value as WaReceiveMessageBody;
      const phoneId = value?.metadata?.phone_number_id;

      if (!phoneId) continue;

      const waSettings = await getWaSettingsByPhoneId(phoneId);
      if (!waSettings) {
        log.error("WaSettings not found for phone_id: %s", phoneId);
        continue;
      }

      // The business number the echo came in on, written the same way the inbound
      // handler writes it (digits, no `+`) so both halves of a thread agree on
      // which channel they ran through. `message.to` is the *customer* — storing
      // that as the channel made the inbox name the customer's own number as the
      // channel, and left replies with no channel to resolve back to.
      const channelIdentifier =
        channelDigits(value?.metadata?.display_phone_number) || channelDigits(waSettings.phone);

      if (value.message_echoes) {
        for (const message of value.message_echoes) {
          try {
            // An echoed revoke is the business side deleting its own message —
            // same treatment as a customer revoke: flag the original, store nothing.
            if (message.type === WaMessageTypes.revoke) {
              await handleRevokedMessage(waSettings, message);
              continue;
            }
            // Meta can deliver the same echo more than once; the id is Meta's own.
            if (message.id && (await getWaMessageByMessageId(message.id))) continue;

            // A Meta AI reply is automation, not something a person typed in the
            // WA app. The tag stays on the stored body, which is what the inbox
            // reads to label it as the AI's.
            const byMetaAi = isMetaAiOriginated(message.biz_opaque_callback_data);
            const stored = await handleWaMessages(
              "send",
              message,
              message.to,
              waSettings.orgId,
              PlatformType.WHATSAPP,
              channelIdentifier,
              undefined,
              message.id,
              undefined,
              false,
              null,
              byMetaAi ? "AUTOMATED" : "INBOX",
              byMetaAi,
            );
            // After the store, so a redelivered echo (skipped above) is never
            // counted twice and a reply that failed to save is not counted at all.
            if (byMetaAi && stored?.contactId) {
              await recordMetaAiTokenUsage({
                orgId: waSettings.orgId,
                contactId: stored.contactId,
                replyBody: message,
              });
            }
          } catch (error) {
            log.error(
              { err: error },
              `Error processing SMB Message Echo for message_id ${message.id}`,
            );
          }
        }
      }
    }
  }
}

/**
 * A `standby` change: a thread the Meta Business Agent (Meta AI) is answering.
 * Meta nests what would normally be the whole `value` under `value.standby`, so
 * each arm is unwrapped into the regular webhook shape and handed to the handler
 * that already stores it:
 *
 * - `messages` — the customer's side. Stored only: the agent is replying, and
 *   our own automations answering too would talk over it.
 * - `message_echoes` — the agent's replies, tagged `originator: bizai`. Stored as
 *   automated sends, which the inbox labels as Meta AI.
 * - `statuses` — delivery for those replies, same as any other send.
 *
 * One message or status per synthetic body, because the downstream handlers
 * only ever read the first.
 */
async function handleStandbyEvent(body: WaMessageBody) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value as WaStandbyChangeValue;
      const standby = value?.standby;
      if (!standby) continue;

      // Meta only routes a thread to standby while the agent holds it, so any
      // traffic here says the AI is answering — even if we never saw a handover.
      await markStandbyThreadsAsAi(value);

      const base = { messaging_product: value.messaging_product, metadata: value.metadata };
      const wrap = (field: string, inner: object) =>
        ({
          object: body.object,
          entry: [{ id: entry.id, changes: [{ field, value: { ...base, ...inner } }] }],
        }) as unknown as WaMessageBody;

      for (const message of standby.messages ?? []) {
        await handleMessageEvent(
          wrap(WaEvent.Message, { contacts: standby.contacts, messages: [message] }),
          { storeOnly: true },
        );
      }

      if (standby.message_echoes?.length) {
        // Flattened to the `smb_message_echoes` shape: id and time from the
        // wrapper, the send itself from `message`, `from` as the business number.
        const echoes = standby.message_echoes.map((echo) => ({
          ...echo.message,
          id: echo.id,
          timestamp: echo.timestamp,
          from: value.metadata?.display_phone_number,
        }));
        await handleSMBMessageEchoes(wrap(WaEvent.SMBMessageEchoes, { message_echoes: echoes }));
      }

      for (const status of standby.statuses ?? []) {
        await handleMessageStatusEvent(
          wrap(status.status, { contacts: standby.contacts, statuses: [status] }),
          status.status as WaEvent,
        );
      }
    }
  }
}

/** Each customer seen in a standby change, at the latest moment seen, is on Meta AI. */
async function markStandbyThreadsAsAi(value: WaStandbyChangeValue) {
  const phoneId = value?.metadata?.phone_number_id;
  if (!phoneId) return;
  const latest = new Map<string, Date>();
  const note = (phone: string | undefined, timestamp: string | undefined) => {
    if (!phone) return;
    const at = metaTimestampToDate(timestamp);
    const seen = latest.get(phone);
    if (!seen || seen < at) latest.set(phone, at);
  };
  for (const message of value.standby.messages ?? []) note(message.from, message.timestamp);
  for (const echo of value.standby.message_echoes ?? []) note(echo.message?.to, echo.timestamp);
  if (latest.size === 0) return;

  const waSettings = await getWaSettingsByPhoneId(phoneId);
  if (!waSettings) return;
  for (const [phone, at] of latest) {
    try {
      await setMetaAgentThreadOwner({
        orgId: waSettings.orgId,
        phone,
        owner: MetaAgentThreadOwner.AI,
        at,
      });
    } catch (error) {
      log.error({ err: error, phone }, "Failed to mark a standby thread as held by Meta AI");
    }
  }
}

/**
 * A `messaging_handovers` change: a thread moved between the Meta Business Agent
 * and a person — e.g. `control_passed` to `escalation` when the customer asks for
 * a human. Recorded on the contact so the inbox can say who is answering.
 */
async function handleMessagingHandoversEvent(body: WaMessageBody) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value as unknown as WaMessagingHandoverValue;
      const phoneId = value?.recipient?.phone_number_id ?? value?.metadata?.phone_number_id;
      const phone = value?.sender?.phone_number;
      const resolved = value ? resolveHandoverOwner(value) : null;
      if (!phoneId || !phone || !resolved) {
        log.warn({ value }, "Unrecognised messaging_handovers change; ignored");
        continue;
      }

      const waSettings = await getWaSettingsByPhoneId(phoneId);
      if (!waSettings) {
        log.error("WaSettings not found for phone_id: %s", phoneId);
        continue;
      }

      try {
        await setMetaAgentThreadOwner({
          orgId: waSettings.orgId,
          phone,
          owner: resolved.owner,
          reason: resolved.reason,
          at: metaTimestampToDate(value.timestamp),
        });
      } catch (error) {
        log.error({ err: error, phone }, "Failed to record a Meta AI thread handover");
      }
    }
  }
}

// Handler: Manage template status changes
async function handleTemplateStatusChange(body: WaMessageBody) {
  const promises = (body.entry || []).flatMap((entry) =>
    (entry.changes || []).map((change) =>
      safeAsyncOperation(
        () => templateStatusChangeHandler(change.value as WaTemplateStatusChange),
        (error) =>
          log.error(
            { err: error },
            `Error handling template status change for template id ${JSON.stringify(change.value)}`,
          ),
      ),
    ),
  );

  await Promise.all(promises);
}

async function handleTemplateCategoryChange(body: WaMessageBody) {
  const promises = (body.entry || []).flatMap((entry) =>
    (entry.changes || []).map((change) =>
      safeAsyncOperation(
        () => templateCategoryChangeHandler(change.value as WaTemplateCategoryChange),
        (error) =>
          log.error(
            { err: error },
            `Error handling template category change for template id ${JSON.stringify(
              change.value,
            )}`,
          ),
      ),
    ),
  );

  await Promise.all(promises);
}

// Handler: Update message statuses
async function handleMessageStatusEvent(body: WaMessageBody, eventType: WaEvent) {
  const promises = (body.entry || []).flatMap((entry) =>
    (entry.changes || []).flatMap((change) => {
      const value = change.value as WaReceiveMessageBody;
      const phoneId = value?.metadata?.phone_number_id;
      return (value?.statuses || []).map((status) =>
        safeAsyncOperation(
          async () => {
            await handleMessageStatusUpdate(eventType, status.id, status.errors, status.pricing);
            if (phoneId) {
              await enqueueWebhookDispatch(phoneId, "message_status", {
                status: status.status,
                messageId: status.id,
                recipientId: status.recipient_id,
                timestamp: status.timestamp,
                errors: status.errors ?? null,
              });
            }
          },
          (error) =>
            log.error(
              { err: error },
              `Error handling message status update for status id ${status.id}`,
            ),
        ),
      );
    }),
  );

  await Promise.all(promises);
}

async function handleAccountUpdateEvent(body: WaMessageBody) {
  const wabaId = body.entry?.[0]?.id;
  const changes = body.entry?.[0]?.changes?.[0];
  const value = (changes?.value as WaAccountUpdate | undefined) ?? {};

  log.info(`Handling Account Update Event for WABA ID: ${wabaId}`);

  // Disconnect if banned or restricted
  if (
    value.ban_info?.ban_status === "BANNED" ||
    (value.restriction_info && value.restriction_info.length > 0)
  ) {
    log.warn(`WABA ID ${wabaId} account restricted or banned. Marking as DISCONNECTED.`);
    await updateWaSettingsStatusByWabaId(wabaId, WhatsappSettingsStatus.DISCONNECTED);
  } else {
    // Other account updates might not imply disconnection, but we log them.
    log.info(`Account update received for WABA ID ${wabaId}: %o`, value);
  }
}

/**
 * Meta decided on a requested display name. Nothing is written: the display name lives at
 * Meta and is read live, while `phoneDisplayName` is the org's own label for the channel.
 * The decision is logged so support can see when a name was approved or why it was refused.
 */
async function handlePhoneNumberNameUpdateEvent(body: WaMessageBody) {
  const wabaId = body.entry?.[0]?.id;
  const value = body.entry?.[0]?.changes?.[0]?.value as WaPhoneNumberNameUpdate | undefined;

  if (!value?.display_phone_number) {
    log.warn("Ignoring phone_number_name_update without a phone number");
    return;
  }

  if (value.decision === "APPROVED") {
    log.info(
      `Display name "${value.requested_verified_name}" approved for ${value.display_phone_number} on WABA ${wabaId}. The number must be re-registered to start using it.`,
    );
    return;
  }

  log.info(
    `Display name "${value.requested_verified_name}" ${value.decision} for ${value.display_phone_number} on WABA ${wabaId}: ${value.rejection_reason ?? "no reason given"}`,
  );
}

async function templateStatusChangeHandler(changeValue: WaTemplateStatusChange) {
  const dbTemplate = await getTemplateWithHSMId(changeValue.message_template_id.toString());
  if (!dbTemplate) {
    log.error("Template not found in db");
    return false;
  } else {
    const waTemplate = dbTemplate.data;
    if (!Object.values(WaTemplateStatus).includes(changeValue.event)) {
      log.error("Invalid status change value");
      return false;
    }
    waTemplate.status = changeValue.event;
    await updateTemplateInDb(dbTemplate.id, dbTemplate.orgId, waTemplate);
    return true;
  }
}

async function templateCategoryChangeHandler(changeValue: WaTemplateCategoryChange) {
  const dbTemplate = await getTemplateWithHSMId(changeValue.message_template_id.toString());
  if (!dbTemplate || !changeValue.new_category) {
    log.error("Template not found in db");
    return false;
  } else {
    const waTemplate = dbTemplate.data;
    waTemplate.category = changeValue.new_category;
    await updateTemplateInDb(dbTemplate.id, dbTemplate.orgId, waTemplate);
    return true;
  }
}

/**
 * A revoke webhook (WhatsApp Business app / coexistence only) says the customer
 * deleted a message they had sent. Nothing is removed here: the original row is
 * flagged so the thread renders it as deleted while keeping what was said. The
 * revoke event itself is not stored as a message and runs no automations — it is
 * an edit to history, not a new turn in the conversation.
 */
async function handleRevokedMessage(
  waSettings: Omit<WhatsappSettings, "accessToken_iv">,
  message: { revoke?: { original_message_id: string } },
) {
  const originalMessageId = message?.revoke?.original_message_id;
  if (!originalMessageId) {
    log.warn("Revoke event without original_message_id: %o", message);
    return;
  }

  const { orgId } = waSettings;
  const deletedMessage = await markWaMessageAsDeleted(originalMessageId, orgId);
  if (!deletedMessage || !deletedMessage.deletedAt) return;

  await sendViaWstoOrgHandler(
    orgId,
    {
      type: "message_deleted",
      message_deleted: {
        messageId: originalMessageId,
        contactId: deletedMessage.contactId,
        conversationId: deletedMessage.conversationId,
        sourceIdentifier: deletedMessage.sourceIdentifier,
        deletedAt: deletedMessage.deletedAt.toISOString(),
        // Lets the client tell whether this message is the one its inbox row is
        // quoting as the preview — that snippet carries no message id.
        waCreatedAt: deletedMessage.waCreatedAt?.toISOString() ?? null,
      },
    },
    deletedMessage.sourcePlatform === PlatformType.WEBCHAT ? "fab" : "main",
  );
}

interface InboundOptions {
  /**
   * Store the message and stop: no loyalty commands, chatbots, flows, automated
   * replies or push notifications. For a thread another app is answering (the
   * Meta Business Agent) — replying from here as well would talk over it.
   */
  storeOnly?: boolean;
}

async function whatsappMessageHandler(
  waSettings: Omit<WhatsappSettings, "accessToken_iv">,
  waMessage: WaMessageBody,
  options: InboundOptions = {},
) {
  // check for '/start' command
  // let phone_number_id =
  //   waMessage?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  const incomingMessage = (waMessage?.entry?.[0]?.changes?.[0]?.value as WaReceiveMessageBody)
    ?.messages?.[0];
  if (incomingMessage?.type === WaMessageTypes.revoke) {
    await handleRevokedMessage(waSettings, incomingMessage);
    return;
  }

  const parsedMessage = parseMessage(waMessage);
  const { orgId } = waSettings;
  const { message: tempMessage, from, type, completeMessageObject, userName } = parsedMessage;

  let sourcePlatform;
  let sourceIdentifier;
  if (waMessage.object === "whatsapp_business_account") {
    sourcePlatform = PlatformType.WHATSAPP;
    sourceIdentifier = (waMessage?.entry?.[0]?.changes?.[0]?.value as WaReceiveMessageBody)
      ?.metadata?.display_phone_number;
  }
  //handle dubplicate webhook
  const existingMessage = await getWaMessageByMessageId(
    (waMessage?.entry?.[0]?.changes?.[0]?.value as WaReceiveMessageBody)?.messages?.[0]?.id,
  );

  if (existingMessage) {
    log.trace("Message already received => %o", existingMessage);
    return;
  }

  const messageObj = await handleWaMessages(
    "receive",
    completeMessageObject,
    from,
    orgId,
    sourcePlatform,
    sourceIdentifier,
    userName,
    (waMessage.entry[0].changes[0].value as WaReceiveMessageBody)?.messages?.[0]?.id,
  );
  if (options.storeOnly) {
    // A survey flow Meta AI sent: the answers are data, not a reply, so they
    // are saved even though nothing else runs for this thread.
    if (type === "nfm_reply") {
      await handleStaticFlowReply(orgId, waMessage, { agentHeld: true });
    }
    return;
  }
  if (type === WaMessageTypes.order) {
    if (!messageObj) {
      log.error("handleWaMessages did not return a message; skipping catalog order handling");
      return;
    }
    await handleWaOrderfromCatalog(
      completeMessageObject as WaReceiveMessageBody,
      messageObj,
      waSettings,
    );
    return;
  }

  // ── Delivery list reply: intercept before other handlers ─────────────────────
  const rawMsg = (completeMessageObject as WaReceiveMessageBody)?.messages?.[0];
  if (rawMsg?.type === "interactive" && rawMsg?.interactive?.type === "list_reply") {
    const listReplyId = rawMsg.interactive?.list_reply?.id as string;
    if (listReplyId?.startsWith("delivery_")) {
      try {
        const { handleDeliveryListReply } = await import("../catalog/catalogSettings.service.js");
        const handled = await handleDeliveryListReply({
          orgId,
          contactPhone: from,
          listReplyId,
          whatsappSettingsPhoneId: waSettings.phoneId ?? undefined,
        });
        if (handled) return;
      } catch (e) {
        log.error({ err: e }, "Error handling delivery list reply");
      }
    }
  }

  const message = tempMessage?.split("\n")?.slice(1)?.join(" ") || tempMessage;
  log.trace("message => %s", message);
  const messageLowerCase =
    type === "text" || type === "interactive" ? message?.trim()?.toLocaleLowerCase() : "";
  // A web self-signup is verified by the customer's first message. Released before the
  // command lookup so a pending customer texting POINTS sees the bonus in the reply.
  try {
    await releasePendingSignupBonusByPhone(from, orgId);
  } catch (e) {
    log.error({ err: e }, "Error releasing a pending loyalty signup bonus");
  }
  const loyaltyWaCommand = await getLoyaltyWaCommandByRequestMessage(orgId, message);
  const joinTapped = isJoinTap(parsedMessage);
  const loyaltyReply: InboundReplyContext = {
    orgId,
    channel: LoyaltyChannel.WHATSAPP,
    from,
    phoneId: waSettings.phoneId,
    name: userName,
  };
  // A new member's first message opens the window their card can be sent in. The join and
  // "card" paths send it themselves, so they are left alone here.
  const sendsCardItself =
    joinTapped ||
    loyaltyWaCommand?.type === LoyaltyTemplateTypes.MemberCard ||
    loyaltyWaCommand?.type === LoyaltyTemplateTypes.CustomerRegistration ||
    parseWaJoinMessage(message)?.isJoin === true;
  if (!sendsCardItself) {
    try {
      await sendMemberCardIfDue(from, orgId);
    } catch (e) {
      log.error({ err: e }, "Error sending a member card on first message");
    }
  }
  if (parsedMessage?.buttonId && !joinTapped) {
    const handledLoyaltyRedeem = await handleLoyaltyRedeemInteraction(loyaltyReply, parsedMessage);
    if (handledLoyaltyRedeem) {
      return;
    }
  }
  // Handle button click interactions first
  if (parsedMessage?.buttonId && !loyaltyWaCommand && !joinTapped) {
    await handleButtonClickInteraction(from, parsedMessage, orgId);
    return;
  }

  const joinPayload = parseWaJoinMessage(message);

  if (joinPayload?.isJoin || joinTapped) {
    await handleWaJoinRegistration({
      orgId,
      from,
      userName,
      joinPayload: joinPayload ?? {},
      sourceIdentifier,
      reply: loyaltyReply,
    });
    return;
  }

  // Deliberately below the interaction handlers above rather than straight after
  // the message is stored. Button taps, loyalty redemptions and join
  // registrations all return before this point: they are self-service traffic the
  // bot answers itself, and pushing "New message from X" for each one taught
  // agents to swipe the notification away without reading it. `loyaltyWaCommand`
  // is excluded here rather than by an early return because its handler runs at
  // the foot of this function, not as a return.
  if (!loyaltyWaCommand) {
    // Assigned users only, falling back to the org when the contact is
    // unassigned — see `getTokensForContactAudience`.
    const expoTokens = await getTokensForContactAudience(orgId, messageObj?.contactId);
    if (expoTokens.length > 0) {
      await notificationQueue.add("notification", {
        pushNotificationData: {
          expoTokens,
          title: "RateUp",
          body: `New message from ${userName}`,
          data: {
            type: "wa_message",
            ...(messageObj?.contactId ? { contactId: messageObj.contactId } : {}),
          },
        },
      });
    }
  }

  const { isAiBotActive, chatbotId } = await getAiBotActiveStatus(from, orgId);
  if (isAiBotActive) {
    try {
      // Process AI chatbot interaction
      if (!chatbotId) {
        log.warn(`Active AI bot found but no chatbot ID for phone: ${from} in org: ${orgId}`);
        await setAiBotActiveStatus(from, orgId, false, "");
        return;
      }
      const chatbot = await getChatbotDetails(orgId, chatbotId, true);
      if (chatbot) {
        await handleAiWaChat(chatbot, message, orgId, from, chatbotId);
        return;
      } else {
        log.warn(`Active AI bot found but no chatbot details for ID: ${chatbotId}`);
        await setAiBotActiveStatus(from, orgId, false, "");
      }
    } catch (error) {
      log.error({ err: error }, "Error handling AI bot interaction");
      await sendTextMessage(
        { phone: from, orgId },
        null,
        "Sorry, I'm having trouble processing your request right now.",
      );
    }
  }

  if (loyaltyWaCommand) {
    await handleLoyaltyWaCommand(loyaltyReply, loyaltyWaCommand, sourceIdentifier);
  } else if (parseStartMessage(message)) {
    await handleStartMessage(orgId, waMessage);
  } else if (parsedMessage.type === "nfm_reply") {
    // ── Check if this is a catalog address flow response ──────────────────────
    const addressData = flowResponseStrings(parsedMessage.flowResponse);
    const flowToken = addressData?.flow_token as string | undefined;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (flowToken && uuidRegex.test(flowToken)) {
      try {
        const { handleAddressFlowResponse } = await import("../catalog/catalogSettings.service.js");
        const handled = await handleAddressFlowResponse({
          orgId,
          orderId: flowToken,
          addressData,
          contactPhone: from,
          whatsappSettingsPhoneId: waSettings?.phoneId ?? undefined,
        });
        if (handled) {
          // Catalog address flow handled — skip regular flow handler
          return;
        }
      } catch (e) {
        log.error({ err: e }, "Error handling catalog address flow response");
      }
    }
    await handleStaticFlowReply(orgId, waMessage);
  } else if (
    messageLowerCase === WA_SUBSCRIBE_STATUS.STOP ||
    messageLowerCase === WA_SUBSCRIBE_STATUS.SUBSCRIBE
  ) {
    await handleSubscriptionStatus(orgId, from, messageLowerCase);
  } else {
    try {
      await sendNewCustomerWelcomeIfDue({
        orgId,
        contactId: messageObj?.contactId,
        phone: from,
        name: userName,
      });
    } catch (e) {
      log.error({ err: e }, "Error sending the loyalty welcome to a new contact");
    }
    await handleAutomatedReply(orgId, waMessage, parsedMessage, from, message);
  }
}

export async function handleWaJoinRegistration({
  orgId,
  from,
  userName,
  joinPayload,
  sourceIdentifier,
  reply = { orgId, channel: LoyaltyChannel.WHATSAPP, from, name: userName },
}: {
  orgId: string;
  from: string;
  userName?: string;
  joinPayload: { source?: string; referralCode?: string };
  sourceIdentifier: string | undefined;
  reply?: InboundReplyContext;
}) {
  const program = await getLoyaltyProgramByOrg(orgId);
  if (program?.status !== "active") {
    log.error(
      "Loyalty program not found or inactive for orgId: %s, status: %s",
      orgId,
      program?.status,
    );
    await replySystem(reply, "programUnavailable");
    return;
  }
  // 1. Check if already registered
  const existingCustomer = await prisma.customerLoyaltyAccount.findFirst({
    where: {
      contact: {
        phone: from,
        orgId,
      },
      programId: program.id,
      status: "active",
    },
  });

  if (existingCustomer) {
    await replySystem(reply, "alreadyRegistered");
    return;
  }
  // 2. Create or update customer
  await createCustomerAccount(
    {
      phone: from,
      name: userName ?? "",
      referCode: joinPayload.referralCode,
      source: joinPayload.source || "WHATSAPP",
      orgId: orgId,
    },
    program.id,
    orgId,
    sourceIdentifier,
    { reply },
  );
}

const pendingConfirmationMap = new Map<string, boolean>();
async function handleAiWaChat(
  chatbot: Awaited<ReturnType<typeof getChatbotDetails>>,
  message: string,
  orgId: string,
  phone: string,
  chatbotId: string,
) {
  try {
    if (!chatbot) {
      log.error("handleAiWaChat called without a chatbot, phone: %s, orgId: %s", phone, orgId);
      return;
    }
    let query = "";
    const contact = await getContactByPhoneNumberAndOrgId(phone, orgId);
    if (!contact) {
      log.error("Contact not found for phone: %s, orgId: %s", phone, orgId);
      return;
    }
    if (chatbot.enableAllWaChat && !contact.aiWaChat) {
      log.trace("Ai chat is disabled for phone: %s", phone);
      return;
    }
    const jwtToken = await createJWT({
      userId: contact.id,
      orgId,
      role: "Contact",
    });

    if (chatbot.enableAllWaChat) {
      query = message;
    } else {
      query = message.slice(chatbot?.waCommand?.length);
    }

    if (pendingConfirmationMap.get(phone)) {
      const lowerMessage = query?.trim()?.toLowerCase();

      if (lowerMessage === "yes") {
        await setAiBotActiveStatus(phone, orgId, false, "");
        await sendTextMessage({ phone: phone, orgId }, null, "You have exited the AI chatbot.");
        pendingConfirmationMap.delete(phone); // done
        aibotNodeCompletion(phone, orgId);
        return;
      } else if (lowerMessage === "no") {
        await sendTextMessage({ phone: phone, orgId }, null, "Okay, continuing the conversation!");
        pendingConfirmationMap.delete(phone); // still exit confirmation mode
        return;
      } else {
        await sendTextMessage({ phone: phone, orgId }, null, "Please reply with 'Yes' or 'No'.");
        return;
      }
    }

    const response = await getAIResponseForQuery(
      {
        query,
        userId: contact.id,
        orgId,
        chatbotId,
        customPrompt: chatbot.waPrompt ?? undefined,
      },
      jwtToken,
    );

    if (response.trim() === "AiBotExitTriggered") {
      const confirmationMessage = "Are you done with the conversation? Please reply 'Yes' or 'No'.";

      await sendTextMessage({ phone, orgId }, null, confirmationMessage);

      await pendingConfirmationMap.set(phone, true);
    } else {
      if (response) await sendTextMessage({ phone, orgId }, null, response);
      else await sendTextMessage({ phone, orgId }, null, "Unable to reply. Something went wrong!");
    }
  } catch (e) {
    log.error(e);
    await sendTextMessage({ phone, orgId }, null, "Unable to reply. Something went wrong!");
  }
}

async function handleSubscriptionStatus(orgId: string, phone: string, message: string) {
  const isSubscribe = message === WA_SUBSCRIBE_STATUS.SUBSCRIBE;
  const consent = await handleContactConsent(orgId, phone, isSubscribe);
  if (!consent) return;
  const org = await getOrgById(orgId);
  if (!org) {
    log.error("Org not found for orgId: %s", orgId);
    return;
  }
  if (isSubscribe) {
    await sendTextMessage(
      { phone, orgId },
      "",
      `Great! You will now receive notifications from ${org.name}.`,
    );
  } else {
    await sendMessage(
      orgId,
      createReplyButtonsMessage(
        phone,
        "",
        `You have successfully opted out from receiving notifications from ${org.name}.If you wish to re-subscribe to notifications click on "SUBSCRIBE" button`,
        ["SUBSCRIBE"],
      ),
    );
  }
}

async function handleInputReply({
  phone,
  orgId,
  parsedMessage,
}: {
  phone: string;
  orgId: string;
  parsedMessage: WaParsedMessage;
}) {
  // Find the most recent automation progress for this phone/org in the last 4 hours
  const progress = await findRecentAutomation(phone, orgId, {
    timeWindow: 4 * 60 * 60 * 1000, // 4 hours
  });
  const automation = progress?.waAutomatedReply;
  if (automation) {
    const matchData = automation.matchData as {
      json: AutomationGraph;
    };
    const nextEdge = matchData?.json?.edges?.find((edge) => edge.target === progress.currentNode);

    if (!nextEdge) return false;

    const nextNode = matchData?.json?.nodes?.find((node) => node.id === nextEdge.source);

    if (!nextNode) return false;

    if (nextNode.type === "textInputNode") {
      // Log flow submission using the utility function

      logAutomationAction({
        phone,
        nodeId: nextNode.id,
        automationId: automation.id,
        orgId,
        response: {
          value: parsedMessage?.message,
          variable: String(nextNode?.data?.variableName ?? ""),
          action: "user_input",
        },
      });

      await processNextNode(phone, automation, progress.currentNode ?? "", orgId, automation.id);
      return true;
    }
  }
  return false;
}
/**
 * Handles automated replies for WhatsApp messages
 * @param orgId Organization ID
 * @param waMessage WhatsApp message body
 * @param parsedMessage Parsed message data
 * @param phone User's phone number
 * @param message Original message text
 * @param automatedReplyId Optional ID of the automated reply to use
 */
export async function handleAutomatedReply(
  orgId: string,
  // Manual triggers (see initiateAutomatedReplyByIdHandler) have no real incoming
  // WhatsApp webhook payload to supply, so these are nullable for that caller. The
  // else-branch below (real webhook-driven messages) guards and narrows them back to
  // non-null before using them.
  waMessage: WaMessageBody | null,
  parsedMessage: WaParsedMessage | null,
  phone: string,
  message: string | null,
  automatedReplyId?: string,
) {
  if (!automatedReplyId) {
    // already handled on case manual trigger
    if (!(await verifyAutomationTriggerLimit(orgId))) return;
  }

  const phoneNumberId = (waMessage?.entry?.[0]?.changes?.[0]?.value as WaReceiveMessageBody)
    ?.metadata?.phone_number_id;

  try {
    if (automatedReplyId) {
      const automation = await getAutomatedReplyById(automatedReplyId, orgId);
      if (automation) {
        if (phoneNumberId) {
          automation.whatsappSettingsPhoneId = phoneNumberId;
        }
        await startAutomationFlow(phone, automation, parsedMessage, orgId);
        await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
      }
    } else {
      if (!waMessage || !parsedMessage || !message) {
        throw new Error(
          "waMessage, parsedMessage, and message are required when no automatedReplyId is provided",
        );
      }
      const inputHandled = await handleInputReply({
        phone,
        orgId,
        parsedMessage,
      });
      if (inputHandled) return;
      // Check rule-based automation first
      const ruleResult = await checkAndExecuteRuleByTriggerEvent("MESSAGE_RECEIVED", {
        orgId,
        phoneNumberId,
        message,
        phone,
        waMessage,
        buttonPayload: parsedMessage?.buttonPayload,
        platform: "WHATSAPP",
      });

      if (ruleResult) {
        log.trace("Rule matched and actions executed: %o", ruleResult);
        return;
      }
      await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
    }
  } catch (error) {
    log.error({ err: error }, "Error handling automated reply");
  }
}

export async function handleButtonClickInteraction(
  phone: string,
  parsedMessage: WaParsedMessage,
  orgId: string,
) {
  // Use the utility function instead of duplicating the query
  const recentInteraction = await findRecentAutomation(phone, orgId, {
    timeWindow: 24 * 60 * 60 * 1000, // 24 hours
  });

  const automation = recentInteraction?.waAutomatedReply as {
    id: string;
    matchData: { json: AutomationGraph };
    whatsappSettingsPhoneId: string;
  };
  if (!automation || !recentInteraction) {
    log.warn(`No active automation found for button click from ${phone}`);
    return;
  }

  // Log button click action using the utility function
  const automationLog = await logAutomationAction({
    phone,
    nodeId: recentInteraction.currentNode ?? "",
    automationId: automation.id,
    orgId,
    response: {
      value: parsedMessage?.message,
      buttonId: parsedMessage.buttonId,
      action: "button_click",
    },
  });

  // Find the next nodes based on the button clicked
  const nextNodes = automation?.matchData?.json?.edges.filter(
    (edge) => edge.sourceHandle === parsedMessage.buttonId,
  );
  if (nextNodes.length) {
    for (const node of nextNodes) {
      if (node?.target) {
        await processNextNode(phone, automation, node.target, orgId, automationLog?.id);
      }
    }
  } else {
    log.warn(`No next node found for buttonId ${parsedMessage.buttonId}`);
  }
}
/**
 * Starts an automation flow from the beginning (start node)
 * @param phone User's phone number
 * @param automation The automation flow data
 * @param parsedMessage Parsed message data from WhatsApp
 * @param orgId Organization ID
 * @returns Promise that resolves when the automation has started
 */
async function startAutomationFlow(
  phone: string,
  automation: AutomationWithGraph,
  parsedMessage: WaParsedMessage | null,
  orgId: string,
) {
  const startNode = automation?.matchData?.json?.nodes?.find((node) => node.type === "startNode");

  if (!startNode) {
    log.error(`No start node found in automation ${automation.id}`);
    return;
  }

  // Create record of this interaction using the utility function
  const automationLog = await logAutomationAction({
    phone,
    nodeId: startNode.id,
    automationId: automation.id,
    orgId,
    response: {
      value: parsedMessage?.message,
      action: "initial_interaction",
    },
  });

  await processNextNode(phone, automation, startNode.id, orgId, automationLog?.id);
}

/**
 * Process a node in the automation flow and move to the next node if applicable
 * @param userPhone User's phone number
 * @param automation The automation flow data
 * @param nodeId Current node ID to process
 * @param orgId Organization ID
 */
export async function processNextNode(
  userPhone: string,
  automation: AutomationWithGraph,
  nodeId: string,
  orgId: string,
  automationMessageId: string | undefined,
  lead?: MetaAsset["leads"][0],
) {
  try {
    if (!nodeId || !automation?.matchData?.json?.nodes) {
      log.error("Invalid node ID or automation data");
      return;
    }

    // Find the current node. The stored node carries the union of every node
    // kind's data; the switch below discriminates on `type`.
    const node = automation.matchData?.json?.nodes.find((n) => n.id === nodeId) as
      | (TypedNode & {
          data: {
            template?: { id: string; name: string };
            flow?: { id: string; name: string };
            parameters?: TemplateComponent[];
            teamId?: string;
          };
        })
      | undefined;
    if (!node) {
      log.error("Automation %s has no node %s", automation.id, nodeId);
      return;
    }

    if (!node) {
      log.error(`Node with ID ${nodeId} not found in automation flow`);
      return;
    }

    // Skip processing for special nodes
    if (["endNode", "startNode", "leadgenNode"].includes(node?.type)) {
      // For start node, just move to the next node
      const nextEdges = automation.matchData?.json?.edges.filter((edge) => edge.source === nodeId);

      if (nextEdges) {
        for (const nextEdge of nextEdges) {
          await prisma.waAutomatedReplyMessage.updateMany({
            where: { phone: userPhone, waAutomatedReplyId: automation.id },
            data: { currentNode: nextEdge.target },
          });
          await processNextNode(
            userPhone,
            automation,
            nextEdge.target,
            orgId,
            automationMessageId,
            lead,
          );
        }
      }

      return;
    }

    // Process different node types
    switch (node.type) {
      case "flowNode":
        await handleFlowNode(
          node,
          userPhone,
          orgId,
          automation?.whatsappSettingsPhoneId ?? undefined,
        );
        break;
      case "aibotNode":
        await handleAiBotNode(node, userPhone, orgId);
        break;

      case "templateNode":
        let parameters = node?.data?.parameters;
        if (lead) {
          parameters = node?.data?.parameters?.map((param) => {
            if (param.type === "body") {
              const newParams = param?.parameters?.map((p: TemplateComponentParameter) => {
                if (
                  p?.text &&
                  typeof p.text !== "string" &&
                  p.text.type === "leadgenform-question-key"
                ) {
                  const fieldName = p.text.value;
                  p.text =
                    lead.field_data.find((field) => field.name === fieldName)?.values[0] ?? null;
                }
                return p;
              });
              param.parameters = [...newParams];
            }
            return param;
          });
        }
        if (!node?.data?.template?.id) {
          log.error("templateNode has no associated template id");
          break;
        }
        await sendTemplateToUserCore(
          orgId,
          node.data.template.id,
          userPhone,
          parameters ?? [],
          node?.data?.teamId,
          undefined,
          undefined,
          undefined,
          undefined,
        );
        break;
      case "pauseNode": {
        if (!automationMessageId) {
          log.error("Cannot pause automation without an automationMessageId");
          break;
        }
        const pauseData = node.data as NodeTypeMap["pauseNode"];
        let ms = 0;
        const duration = pauseData.duration || 0;
        const unit = pauseData.unit || "seconds";

        if (unit === "seconds") ms = duration * 1000;
        else if (unit === "minutes") ms = duration * 60 * 1000;
        else if (unit === "hours") ms = duration * 60 * 60 * 1000;

        // Add delayed job to BullMQ
        const job = await pausedAutomationQueue.add(
          "resume-automation",
          {
            automationMessageId,
            phone: userPhone,
            orgId,
            currentNode: nodeId,
            automationId: automation.id,
          },
          {
            delay: ms,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
          },
        );

        // Update database with paused status and job ID
        await prisma.waAutomatedReplyMessage.update({
          where: { id: automationMessageId },
          data: {
            status: WaAutomationProgressStatus.paused,
          },
        });

        log.info(
          `Paused automation ${automationMessageId} for ${duration} ${unit}, job ID: ${job.id}`,
        );
        return;
      }

      case "assignNode": {
        const assignData = node?.data as NodeTypeMap["assignNode"];
        const contactResult = await getOrCreateContactByPhone(
          userPhone,
          orgId,
          undefined,
          undefined,
          true,
        );
        if (!contactResult) {
          log.error("Could not get or create contact for assignNode, phone: %s", userPhone);
          break;
        }
        const { contact } = contactResult;
        let assignedUserIds = assignData?.assign?.assignedUserIds || [];
        let teamId = assignData?.assign?.teamId || null;
        if (assignData?.assign?.assignType === "me") {
          const teams = await getTeamIdsByUserId(assignedUserIds?.[0]);
          teamId = teams?.[0] || null;
        } else if (
          teamId &&
          assignData?.assign?.choice === "all" &&
          (assignData?.assign?.roundRobin || false)
        ) {
          const assignedCount = await getAssignedUsersCountForContactByTeam(contact.id, teamId);
          if (assignedCount > 0) {
            log.warn(
              `Skipping assignment: Contact ${contact.id} already has assigned users in team ${teamId}`,
            );
            assignedUserIds = [];
            return;
          }
          const users = await getUserIdsByTeamId(teamId);
          const assigned = await assignChat(teamId, users, automation?.id);
          assignedUserIds = [assigned];
        } else if (
          teamId &&
          assignData?.assign?.choice === "manual" &&
          (assignData?.assign?.roundRobin || false)
        ) {
          const assignedCount = await getAssignedUsersCountForContactByTeam(contact.id, teamId);
          if (assignedCount > 0) {
            log.warn(
              `Skipping assignment: Contact ${contact.id} already has assigned users in team ${teamId}`,
            );
            assignedUserIds = [];
            return;
          }
          const assigned = await assignChat(teamId, assignedUserIds, automation?.id);
          assignedUserIds = [assigned];
        } else if (teamId && assignData?.assign?.choice === "all") {
          const users = await getUserIdsByTeamId(teamId);
          assignedUserIds = users;
        }
        // Only assign if we have user IDs and a team
        if (assignedUserIds.length > 0 && teamId && contact?.id) {
          await assignWaMessageToUser(
            {
              assignees: assignedUserIds.map((userId) => ({ userId, teamId })),
              contactId: contact.id,
              assignIfOnline: assignData?.assign?.assignIfOnline ?? true,
            },
            orgId,
          );
        } else {
          log.warn(
            `Assignment skipped: assignedUserIds=${JSON.stringify(
              assignedUserIds,
            )}, teamId=${teamId}, contactId=${contact?.id}`,
          );
        }
        break;
      }
      default:
        // For text, buttons, and other message types
        const waMessage = await convertNodeToWhatsAppMessage(node, userPhone);
        // convertNodeToWhatsAppMessage returns null for node kinds that send
        // nothing themselves (e.g. pause/assign). WhatsAppMessage is the
        // builder's own loose shape; sendMessage takes the concrete send bodies.
        if (!waMessage) break;
        await sendMessage(
          orgId,
          waMessage as unknown as WaSendMessageBody,
          undefined,
          undefined,
          automation?.whatsappSettingsPhoneId ?? undefined,
        );
        break;
    }

    // Find and process next node unless current node requires user input
    let requiresUserInput = ["buttonNode", "flowNode", "listNode", "textInputNode"].includes(
      node?.type,
    );
    // Special check for AI Bot Node
    if (node?.type === "aibotNode") {
      const isActive = await getAiBotActiveStatus(userPhone, orgId);
      if (isActive) {
        requiresUserInput = true; // Chat still happening → stop automation
      } else {
        requiresUserInput = false; // Chat finished → continue automation
      }
    }
    const nextEdges = automation.matchData?.json?.edges.filter((edge) => edge.source === nodeId);

    if (nextEdges) {
      for (const nextEdge of nextEdges) {
        await prisma.waAutomatedReplyMessage.updateMany({
          where: { phone: userPhone, waAutomatedReplyId: automation.id },
          data: { currentNode: nextEdge.target },
        });
        if (!requiresUserInput) {
          await processNextNode(
            userPhone,
            automation,
            nextEdge.target,
            orgId,
            automationMessageId,
            lead,
          );
        }
      }
    } else {
      // No next node, mark as completed
      await prisma.waAutomatedReplyMessage.updateMany({
        where: { phone: userPhone, waAutomatedReplyId: automation.id },
        data: { status: "completed" },
      });
    }
  } catch (error) {
    log.error({ err: error }, `Error processing node ${nodeId}`);
  }
}

/**
 * Handle processing of a flow node
 * @param node Flow node to process
 * @param userPhone User's phone number
 * @param orgId Organization ID
 * @param whatsappSettingsPhoneId WhatsApp settings phone ID
 */
async function handleFlowNode(
  node: TypedNode & { data: { flow?: { id: string; name: string }; teamId?: string } },
  userPhone: string,
  orgId: string,
  whatsappSettingsPhoneId?: string,
) {
  try {
    const flowId = node?.data?.flow?.id;
    const teamId = node?.data?.teamId;

    if (!flowId) {
      throw new Error("Flow ID not found in node data");
    }

    // Get flow data
    const dbFlow = await getFlowWithSurveyTeamMapIdsWithDbFlowId(flowId, orgId);

    if (!dbFlow) {
      throw new Error(`Flow with ID ${flowId} not found`);
    }

    // Find survey team map
    const surveyTeamMap = dbFlow?.survey?.teams?.find((team) => team?.teamId === teamId);

    if (!surveyTeamMap) {
      throw new Error(`No survey team map found for team ID ${teamId}`);
    }

    // Send the flow
    await sendFlow({
      orgId,
      dbFlowId: flowId,
      phone: userPhone,
      whatsappSettingsPhoneId,
      context: { surveyTeamMapId: surveyTeamMap.id },
    });
  } catch (error) {
    log.error({ err: error }, "Error handling flow node");
    throw error; // Let the caller handle this
  }
}

async function handleAiBotNode(
  node: TypedNode & { data: { chatbot?: { id: string; name: string }; body?: string } },
  userPhone: string,
  orgId: string,
) {
  const data = node.data as NodeTypeMap["aibotNode"];

  const chatbotId = data.chatbot.id;

  const text = data.body ? parseToWhatsAppFormat(data.body) : "Default message";

  if (text) await sendTextMessage({ phone: userPhone, orgId }, null, text);

  await setAiBotActiveStatus(userPhone, orgId, true, chatbotId);
}

async function handleStartMessage(orgId: string, waMessage: WaMessageBody) {
  log.trace("handling start message");

  const { from, message: fullMessage } = parseMessage(waMessage);
  const messageWithTagSplit = fullMessage.split("?t=");
  const message = messageWithTagSplit?.[0];
  const tag = messageWithTagSplit?.[1];

  const parsedStartMessage = parseStartMessage(message);
  if (!parsedStartMessage) {
    log.error("Not a valid start message");
    return;
  }

  const { surveyName, teamCode } = parsedStartMessage;
  const surveyTeamMap = await prisma.surveyTeamMap.findFirst({
    where: {
      survey: {
        title: surveyName,
      },
      team: {
        code: teamCode,
        orgId,
      },
    },
  });
  if (!surveyTeamMap) {
    log.error("surveyTeamMap not found with %o", {
      surveyName,
      teamCode,
      orgId,
    });
    return;
  }
  const surveyTeamMapId = surveyTeamMap?.id;

  if (!surveyTeamMapId) {
    log.error("surveyTeamMapId not found in message");
    return;
  }

  // TODO: handle invalid surveyTeamMapId
  await handleStartSurvey({
    from,
    surveyTeamMapId,
    orgId,
    tag,
  });
}

async function handleStartSurvey({
  from,
  surveyTeamMapId,
  orgId,
  tag,
}: {
  from: string;
  surveyTeamMapId: string;
  orgId: string;
  tag?: string;
}) {
  const surveyTeamMap = await getSurveyTeamMapWithFlow(surveyTeamMapId);
  if (!surveyTeamMap) {
    log.error({ orgId, surveyTeamMapId }, "SurveyTeamMap not found");
    return;
  }
  // Question-by-question WhatsApp surveys were retired: only WhatsApp Flows are
  // sent over WhatsApp now. A survey of any other type has no delivery path here.
  if (surveyTeamMap.survey.type !== SurveyType.WaFlow) {
    log.error(
      { orgId, surveyTeamMapId, type: surveyTeamMap.survey.type },
      "Survey is not a WhatsApp Flow; nothing to send over WhatsApp",
    );
    return;
  }
  const msgLimit = await checkConversationLimitAvailable(orgId);
  if (!msgLimit) {
    log.error({ orgId }, "You have reached the maximum monthly limit of messages.");
    return;
  }
  updateVisitedSurvey(surveyTeamMap.id)
    .then(() => {})
    .catch((e) => log.error(e)); // increment visited survey count
  updateStartedSurvey(surveyTeamMap.id)
    .then(() => {})
    .catch((e) => log.error(e)); // increment started survey count

  if (orgId) {
    updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
  }
  if (!surveyTeamMap.survey.WaFlow) {
    throw new Error(`WaFlow not found for survey: ${surveyTeamMap.survey.id}`);
  }
  await sendFlow({
    dbFlowId: surveyTeamMap.survey.WaFlow.dbFlowId,
    orgId,
    phone: from,
    context: {
      surveyTeamMapId: surveyTeamMap.id,
      language: surveyTeamMap.survey.languages[0],
      tag,
    },
  });
}

// `sendCampaignToParticipants` and its `_sendCampaignToParticipants` worker
// loop lived here: an in-process `for` over every participant with a
// `await wait(50)` and a `// TODO: add rate limiting`. It was the second of two
// live send paths, overlapping with the BullMQ fan-out the send dialog already
// used, and only avoided double-sending by accident — every live write of
// `scheduledStatuses` is `[]`, so the loop skipped every participant.
//
// Scheduled campaigns now go through `enqueueCampaignMessage` like every other
// send, so each one is a CampaignSend row with its own counters and its own
// retry schedule. See `sendCampaign` in `campaign/campaign.service.ts`.
export function convertComponentForSenting(dbTemplate: WaTemplateWithTypes) {
  const containsImage =
    dbTemplate.data.components.find((c) => c.type.toLowerCase() === WaTemplateComponentType.HEADER)
      ?.format === "IMAGE";

  const components: OutgoingTemplateComponent[] = [];
  const addHeaderComponent = (format: string, link: string, filename: string | null = null) => {
    // The media key is the lowercased format ("image"/"video"/"document"),
    // which is why the parameter shape is keyed dynamically.
    const newComponent: OutgoingTemplateComponent = {
      type: WaTemplateComponentType.HEADER,
      parameters: [
        {
          type: format.toLowerCase(),
          [format.toLowerCase()]: {
            link,
            ...(filename && { filename }),
          },
        },
      ],
    };
    components.push(newComponent);
  };

  if (containsImage) {
    if (!dbTemplate.defaultValues?.image?.link) {
      console.error("Image not found in template %o", dbTemplate);
      throw new Error("Image not found in template. Please delete & create a new template.");
    }
    components.push({
      type: "header",
      parameters: [
        {
          type: "image",
          image: {
            link: getFileUrlFromKey(dbTemplate.defaultValues.image.link),
          },
        },
      ],
    });
  }
  if (dbTemplate.defaultValues?.document?.link) {
    addHeaderComponent(
      WaTemplateSupportedFormats.DOCUMENT,
      getFileUrlFromKey(dbTemplate.defaultValues.document.link),
      dbTemplate.defaultValues?.document?.filename,
    );
  }

  dbTemplate.data.components.forEach((item) => {
    if (item.type?.toLowerCase() === WaTemplateComponentType.BUTTONS) {
      item?.buttons?.forEach((button, idx: number) => {
        if (button.type === "URL" && (button.example?.length ?? 0) > 0) {
          components.push({
            type: "button",
            sub_type: "url",
            index: idx,
            parameters: [
              {
                type: "text",
                text: "9999",
              },
            ],
          });
        }
      });
    } else {
      // components.push(item);
      //skiping for now
    }
  });

  return components;
}
export function updateButtonText(array: OutgoingTemplateComponent[], newText: string) {
  return (
    array.map((item) => {
      if (item.type === "button" && item.sub_type === "url" && (item.parameters?.length ?? 0) > 0) {
        return {
          ...item,
          parameters: item.parameters?.map((param) => {
            if (param.type === "text") {
              return {
                ...param,
                text: newText,
              };
            }
            return param;
          }),
        };
      }
      return item;
    }) ?? []
  );
}
interface _campaign {
  id: string;
  team: {
    id: string;
    orgId: string;
  };
  campaignParticipants: (CampaignParticipant & {
    contact: Contact & {
      customFields: {
        value: string;
        field: {
          slug: string;
        };
      }[];
    };
  })[];
  useUserConsent: boolean;
}
// TODO: use batch sending

// Temporary rate limiting
export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves the status to show for a campaign participant: the latest delivery
 * status where there is one, otherwise the participant's own status.
 */
const getStatusData = (info: {
  status?: string | null;
  errorMessage?: string | null;
  campaign?: { flowId?: string | null } | null;
  WaMessageCampaginParticipantMap?: Parameters<typeof getLatestStatus>[0];
}) => {
  let statusData: string = (
    getLatestStatus(info?.WaMessageCampaginParticipantMap) || ""
  ).toUpperCase();
  const FlowId = info?.campaign?.flowId;
  const participantStatus = info.status?.toUpperCase();
  const errorMessage = info.errorMessage;
  if (FlowId && participantStatus === CampaignParticipantStatus.COMPLETED) {
    statusData = CampaignParticipantStatus.COMPLETED;
  } else if (!statusData || errorMessage) {
    // The participant may carry no status of its own; the caller treats an
    // empty string as "unknown" (this was previously an undefined assignment).
    statusData = participantStatus ?? "";
  }
  return statusData;
};
