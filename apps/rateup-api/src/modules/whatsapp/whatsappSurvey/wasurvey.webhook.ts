/**
 * What a WhatsApp Business webhook delivery *does*: stores inbound messages and
 * runs the automations they trigger, applies delivery statuses, template and
 * account changes, Meta AI thread hand-offs, calls.
 *
 * The HTTP route no longer runs this (`wasurvey.ingress.ts` only verifies the
 * signature and hands the raw body to Kafka); the `kafka` service's
 * `waWebhook.consumer.ts` does, one `wa-webhooks` record at a time. It is also the
 * `WA_WEBHOOK_INGRESS=inline` fallback, which is why it lives in a plain module
 * rather than in the consumer: nothing here starts a consumer or a `Worker`, and
 * nothing here needs the Fastify instance — the Kafka producer, the websocket
 * fan-out (Redis pub/sub) and the logger are all module-level.
 *
 * Every entry, every change, every message and every status is handled. Meta
 * batches: one delivery can carry several messages and a mix of `sent`,
 * `delivered` and `read`, and the old handler read only the first of each.
 *
 * Errors: each handler still logs and contains the failures it always contained,
 * but anything that escapes one change no longer stops the next. They are all
 * thrown together at the end, so the consumer can retry the record — safe,
 * because inbound messages and echoes are de-duplicated by Meta's message id
 * before they are stored.
 */
import { handleCallsWebhook } from "../calling/calling.service.js";
import {
  WA_SUBSCRIBE_STATUS,
  createReplyButtonsMessage,
  flowResponseStrings,
  getEventType,
  handlePaymentConfirmation,
  isMetaAiOriginated,
  parseMessage,
  parseStartMessage,
  parseWaJoinMessage,
} from "./wasurvey.utils.js";
import {
  handleLeadGen,
  handleMessageStatusUpdate,
  sendMessage,
  sendTextMessage,
} from "./wasurvey.service.js";
import {
  SurveyType,
  WaEvent,
  WaTemplateStatus,
  SubscriptionFeaturePathName,
  WhatsappSettingsStatus,
  LoyaltyTemplateTypes,
} from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import {
  getTemplateWithHSMId,
  updateTemplateInDb,
} from "../messageTemplates/wa_templates.service.js";
import {
  getWaSettingsByPhoneId,
  updateWaSettingsStatusByWabaId,
} from "../settings/wa_settings.service.js";
import {
  WaMessageBody,
  WaMessageTypes,
  WaReceiveMessageBody,
  WaReferral,
} from "../../../types/whatsapp.types.js";
import type {
  WaAccountUpdate,
  WaPhoneNumberNameUpdate,
  WaStandbyChangeValue,
  WaTemplateCategoryChange,
  WaTemplateStatusChange,
} from "../../../types/whatsapp.types.js";
import prisma from "../../../utils/prisma.js";
import { updateStartedSurvey, updateVisitedSurvey } from "../../survey/survey.service.js";
import {
  getSurveyTeamMapWithFlow,
  handleStaticFlowReply,
  sendFlow,
} from "../flows/flow.service.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { recordMetaAiTokenUsage } from "../../metaAgent/metaAgent.usage.js";
import {
  metaTimestampToDate,
  resolveHandoverOwner,
  setMetaAgentThreadOwner,
  type WaMessagingHandoverValue,
} from "../../metaAgent/metaAgent.threadOwner.js";
import {
  MetaAgentThreadOwner,
  PlatformType,
  WhatsappSettings,
} from "../../../../generated/prisma/client.js";
import { handleContactConsent } from "../../contact/contact.service.js";
import { getOrgById } from "../../org/org.services.js";
import { canMessageContact } from "../../subscription/activeContacts.js";
import { updateMonthlyStat } from "../../stats/stats.service.js";
import {
  getLoyaltyWaCommandByRequestMessage,
  handleLoyaltyRedeemInteraction,
  handleLoyaltyWaCommand,
} from "../../loyalty/settings/settings.service.js";
import { handleWaOrderfromCatalog } from "../catalog/catalog.service.js";
import { notifyInboundMessage } from "../inbox/message/inboundNotify.js";
import {
  getWaMessageByMessageId,
  markWaMessageAsDeleted,
} from "../inbox/message/wamessage.service.js";
import { releasePendingSignupBonusByPhone } from "../../loyalty/accounts/account.service.js";
import { isJoinTap } from "../../loyalty/loyaltyEventTemplates.js";
import { LoyaltyChannel } from "../../loyalty/messaging/channelIds.js";
import { type InboundReplyContext } from "../../loyalty/messaging/reply.js";
import { sendNewCustomerWelcomeIfDue } from "../../loyalty/newCustomerWelcome.js";
import { sendMemberCardIfDue } from "../../loyalty/accounts/memberCard.service.js";
import { enqueueWebhookDispatch } from "../../webhook/webhook.service.js";
import { phoneSubscribesTo } from "../../webhook/webhook.events.js";
import { sendViaWstoOrgHandler } from "../../org/ws/org.ws.controller.js";
import { channelDigits } from "../../../utils/channelIdentifier.js";
import { notify } from "../../notification/notify.js";
import { handleSenderOrgStop } from "../../customerComms/whatsapp.js";
import { checkAndExecuteRuleByTriggerEvent } from "../automatedReply/wa_automatedReply.utils.js";
import {
  handleAutomatedReply,
  handleButtonClickInteraction,
  handleWaJoinRegistration,
} from "./wasurvey.controller.js";

type WaStatus = WaReceiveMessageBody["statuses"][number];
type WaInboundMessage = WaReceiveMessageBody["messages"][number];

/** The delivery receipts that update a sent message (and fire `message_status`). */
const DELIVERY_STATUSES: ReadonlySet<string> = new Set([
  WaEvent.SENT,
  WaEvent.DELIVERED,
  WaEvent.READ,
  WaEvent.FAILED,
]);

/** Runs one delivery's errors together, so one bad change does not hide the rest. */
function throwCollected(errors: unknown[], what: string) {
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, `${errors.length} ${what} failed`);
}

/** The same delivery narrowed to one entry and one change — the shape every handler reads. */
function singleChangeBody(
  body: WaMessageBody,
  entry: WaMessageBody["entry"][number],
  change: WaMessageBody["entry"][number]["changes"][number],
): WaMessageBody {
  return { ...body, entry: [{ ...entry, changes: [change] }] } as WaMessageBody;
}

/**
 * Handle every entry and change of a webhook delivery. Throws (after trying all of
 * them) when any change failed in a way its handler did not contain.
 */
export async function processWhatsappWebhook(body: WaMessageBody): Promise<void> {
  log.trace("WaEvent => %o", body);
  const errors: unknown[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      try {
        await dispatchChange(singleChangeBody(body, entry, change));
      } catch (error) {
        log.error(
          { err: error, field: change?.field, entryId: entry?.id },
          "Error handling a WhatsApp webhook change",
        );
        errors.push(error);
      }
    }
  }
  throwCollected(errors, "webhook changes");
}

/** `body` carries exactly one entry with exactly one change. */
async function dispatchChange(body: WaMessageBody) {
  const value = body.entry[0].changes[0].value as WaReceiveMessageBody | undefined;
  const hasStatuses =
    body.object === "whatsapp_business_account" && (value?.statuses?.length ?? 0) > 0;

  const eventType = getEventType(body);
  if (!eventType) {
    log.trace("WhatsApp webhook change with nothing to handle: %o", body.entry[0].changes[0]);
    return;
  }

  switch (eventType) {
    case WaEvent.Message:
      await handleMessageEvent(body);
      // Meta does not mix the two in one change today, but nothing says it cannot.
      if (hasStatuses) await handleMessageStatuses(body);
      return;

    case WaEvent.TemplateStatusChange:
      await handleTemplateStatusChange(body);
      return;
    case WaEvent.TemplateCategoryUpdate:
      await handleTemplateCategoryChange(body);
      return;

    case WaEvent.LEADGEN:
      await handleLeadGen(body);
      return;
    case WaEvent.ACCOUNT_UPDATE:
      await handleAccountUpdateEvent(body);
      return;

    case WaEvent.PhoneNumberNameUpdate:
      await handlePhoneNumberNameUpdateEvent(body);
      return;

    case WaEvent.SMBMessageEchoes:
      await handleSMBMessageEchoes(body);
      return;

    case WaEvent.Standby:
      await handleStandbyEvent(body);
      return;

    case WaEvent.MessagingHandovers:
      await handleMessagingHandoversEvent(body);
      return;

    case WaEvent.Calls:
      await handleCallsWebhook(body);
      return;

    default:
      // `getEventType` names a status change after its first status; each status
      // is handled under its own type below.
      if (hasStatuses) {
        await handleMessageStatuses(body);
        return;
      }
      log.warn("Unhandled event type: %s", eventType);
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

/**
 * One inbound message per synthetic body: `parseMessage` and everything after it
 * read `messages[0]` (and `getMessageObject` throws on more than one), so a
 * delivery carrying several used to lose all of them. The sender's own entry
 * goes first in `contacts`, which is where the profile name is read from.
 */
function singleMessageBody(body: WaMessageBody, message: WaInboundMessage): WaMessageBody {
  const entry = body.entry[0];
  const change = entry.changes[0];
  const value = change.value as WaReceiveMessageBody;
  const contacts = value.contacts ?? [];
  const own = contacts.filter((contact) => contact?.wa_id === message.from);
  return singleChangeBody(body, entry, {
    ...change,
    value: { ...value, contacts: own.length ? own : contacts, messages: [message] },
  } as typeof change);
}

// Handler: Manage incoming WhatsApp messages. `body` carries one entry and one change.
async function handleMessageEvent(body: WaMessageBody, options: InboundOptions = {}) {
  const value = body.entry[0].changes[0].value as WaReceiveMessageBody;
  const phoneId = value?.metadata?.phone_number_id;
  const waSettings = await getWaSettingsByPhoneId(phoneId);

  if (!waSettings) {
    log.error("WaSettings not found for phone_id: %s", phoneId);
    return;
  }

  // In order: a customer's burst ("hi", "I want to order", a photo) has to reach
  // the inbox and the automations the way they sent it.
  const errors: unknown[] = [];
  for (const message of value?.messages ?? []) {
    try {
      await whatsappMessageHandler(waSettings, singleMessageBody(body, message), options);
    } catch (error) {
      log.error(
        { err: error, messageId: message?.id },
        "Error processing WhatsApp message for phone_id %s",
        phoneId,
      );
      errors.push(error);
    }
  }
  throwCollected(errors, "inbound messages");
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
            // A cheap early exit only: concurrent copies are settled by the unique
            // index, and the loser gets null back from handleWaMessages below.
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
            // After the store, so a redelivered echo (skipped above, or null from
            // the store) is never counted twice and a reply that failed to save is
            // not counted at all.
            if (stored === null) continue;
            if (byMetaAi && stored.contactId) {
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
 * Each arm goes through as one synthetic body; the message and status handlers
 * walk every item in it.
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

      if (standby.messages?.length) {
        await handleMessageEvent(
          wrap(WaEvent.Message, { contacts: standby.contacts, messages: standby.messages }),
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

      if (standby.statuses?.length) {
        await handleMessageStatuses(
          wrap(WaEvent.Message, { contacts: standby.contacts, statuses: standby.statuses }),
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
  // Only the customer's messages say who holds the thread: Meta routes them
  // to standby while the agent does. The agent's own replies do not — its last
  // one is often the handoff line ("I'll ask a representative…"), sent as it
  // passes the thread on, and reading that as "AI" undid the handover.
  for (const message of value.standby.messages ?? []) note(message.from, message.timestamp);
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
        inferred: true,
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

function isPaymentStatus(status: WaStatus): status is WaStatus & {
  payment: { reference_id: string };
} {
  return status.status === "captured" && !!status.payment?.reference_id;
}

/**
 * Every status in the change, each under its own `status.status`. A batch of
 * `sent` + `delivered` + `read` used to be applied as three of whatever the
 * first one was.
 *
 * A failure to hand a receipt to `status-events` is thrown (after the rest have
 * gone) so the record is retried: that topic is the only place the receipt goes.
 * The outgoing webhook is best-effort, as it always was, and is only queued when
 * the number's org subscribes to `message_status` — most do not, and every
 * receipt used to cost a BullMQ job that delivery then dropped.
 */
async function handleMessageStatuses(body: WaMessageBody) {
  const value = body.entry[0].changes[0].value as WaReceiveMessageBody;
  const phoneId = value?.metadata?.phone_number_id;
  const statuses = value?.statuses ?? [];
  let subscribed: Promise<boolean> | undefined;
  const wantsWebhook = () =>
    phoneId ? (subscribed ??= phoneSubscribesTo(phoneId, "message_status")) : false;

  const results = await Promise.allSettled(
    statuses.map(async (status) => {
      if (!status?.status) return;

      if (isPaymentStatus(status)) {
        await safeAsyncOperation(
          () =>
            handlePaymentConfirmation(status.recipient_id, status.payment.reference_id, phoneId),
          (error) =>
            log.error(
              { err: error },
              `Error handling payment confirmation for recipient_id ${status.recipient_id}`,
            ),
        );
        return;
      }

      if (!DELIVERY_STATUSES.has(status.status)) {
        log.warn("Unhandled status type: %s", status.status);
        return;
      }

      await handleMessageStatusUpdate(status.status, status.id, status.errors, status.pricing);

      if (phoneId && (await wantsWebhook())) {
        await safeAsyncOperation(
          () =>
            enqueueWebhookDispatch(phoneId, "message_status", {
              status: status.status,
              messageId: status.id,
              recipientId: status.recipient_id,
              timestamp: status.timestamp,
              errors: status.errors ?? null,
            }),
          (error) =>
            log.error({ err: error }, `Error queueing the message_status webhook for ${status.id}`),
        );
      }
    }),
  );

  const errors = results.flatMap((result, i) => {
    if (result.status === "fulfilled") return [];
    log.error(
      { err: result.reason },
      `Error handling message status update for status id ${statuses[i]?.id}`,
    );
    return [result.reason];
  });
  throwCollected(errors, "status updates");
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
    // Read before the update: Meta repeats this event, and only the first one is news.
    const newlyDisconnected = wabaId
      ? await prisma.whatsappSettings.findMany({
          where: { wabaId, status: { not: WhatsappSettingsStatus.DISCONNECTED } },
          select: { orgId: true, phone: true, phoneDisplayName: true },
        })
      : [];
    await updateWaSettingsStatusByWabaId(wabaId, WhatsappSettingsStatus.DISCONNECTED);
    for (const channel of newlyDisconnected) {
      await notify({
        event: "whatsapp.account_restricted",
        orgId: channel.orgId,
        audience: { kind: "permitted" },
        data: { channelName: channel.phoneDisplayName || channel.phone || "Your WhatsApp number" },
      });
    }
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
    const previousStatus = waTemplate.status;
    waTemplate.status = changeValue.event;
    await updateTemplateInDb(dbTemplate.id, dbTemplate.orgId, waTemplate);
    const decided =
      changeValue.event === WaTemplateStatus.APPROVED ||
      changeValue.event === WaTemplateStatus.REJECTED;
    if (decided && previousStatus !== changeValue.event) {
      await notify({
        event: "whatsapp.template_status",
        orgId: dbTemplate.orgId,
        audience: { kind: "permitted" },
        data: {
          templateId: dbTemplate.id,
          templateName: waTemplate.name ?? "",
          status: changeValue.event,
        },
      });
    }
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
  // Meta redelivers webhooks. This read is only the cheap early exit for a
  // retry that arrives after the first copy was stored; two copies arriving
  // together both pass it, and the unique `messageId` index then lets only one
  // store — `handleWaMessages` returns null for the other.
  const incomingMessageId = (waMessage?.entry?.[0]?.changes?.[0]?.value as WaReceiveMessageBody)
    ?.messages?.[0]?.id;
  if (!incomingMessageId) {
    // Unreachable for a real message, which always carries its wamid. Dropped,
    // as before: the old lookup ran `findFirst({ messageId: undefined })`, which
    // matched any row and so returned here too.
    log.warn("WhatsApp message event with no message id; skipping");
    return;
  }
  if (await getWaMessageByMessageId(incomingMessageId)) {
    log.trace("Message already received: %s", incomingMessageId);
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
    incomingMessageId,
  );
  // Already stored by another delivery, which is running everything below.
  // Running it here as well is how one message got two automated replies.
  if (messageObj === null) {
    log.debug("Duplicate delivery of %s; skipping its handlers", incomingMessageId);
    return;
  }
  try {
    await handleSenderOrgStop(orgId, from, parsedMessage);
  } catch (e) {
    log.error({ err: e }, "Error handling a customer-comms stop reply");
  }
  // The click on a click-to-WhatsApp ad that opened this chat. Meta sends the referral only
  // here, so it is kept even when Meta AI holds the thread.
  const adReferral = incomingMessage?.referral;
  if (adReferral && messageObj?.contactId) {
    try {
      const { rememberAdReferral } = await import("../../commerce/shop/attribution.js");
      await rememberAdReferral(orgId, messageObj.contactId, adReferral, {
        conversationId: messageObj.conversationId,
        phoneId: waSettings.phoneId,
      });
    } catch (e) {
      log.error({ err: e }, "Could not record the ad referral");
    }
  }
  if (options.storeOnly) {
    // A survey flow Meta AI sent: the answers are data, not a reply, so they
    // are saved even though nothing else runs for this thread.
    if (type === "nfm_reply") {
      await handleStaticFlowReply(orgId, waMessage, { agentHeld: true });
    }
    return;
  }
  // The ad's own rule answers the click, before any keyword rule.
  if (adReferral && (await answerAdReferral(waSettings, from, adReferral))) {
    return;
  }

  if (type === WaMessageTypes.order) {
    const cart = (completeMessageObject as WaReceiveMessageBody).messages?.[0]?.order;
    if (cart?.product_items?.length) {
      try {
        const { startCheckoutFromCart } = await import("../../commerce/shop/checkout.service.js");
        const { chatAttribution } = await import("../../commerce/shop/attribution.js");
        const shopOrder = await startCheckoutFromCart(
          {
            orgId,
            channel: "WHATSAPP",
            channelAccountId: waSettings.phoneId,
            contactId: messageObj.contactId,
            phone: from,
            name: userName,
            attribution: messageObj.contactId
              ? await chatAttribution(orgId, messageObj.contactId)
              : null,
          },
          cart.product_items.map((p) => ({
            retailerId: p.product_retailer_id,
            quantity: Number(p.quantity) || 1,
          })),
        );
        // RateUp shop products check out through the shop; other carts keep the catalog flow.
        if (shopOrder) return;
      } catch (e) {
        log.error({ err: e }, "Shop checkout from a WhatsApp cart failed; using the catalog flow");
      }
    }
    await handleWaOrderfromCatalog(
      completeMessageObject as WaReceiveMessageBody,
      messageObj,
      waSettings,
    );
    return;
  }

  // ── Shop checkout replies (ids "shop_…"): intercept before other handlers ─────
  if (parsedMessage?.buttonId?.startsWith("shop_")) {
    try {
      const { handleShopReply } = await import("../../commerce/shop/checkout.service.js");
      const handled = await handleShopReply(parsedMessage.buttonId, {
        orgId,
        contactId: messageObj?.contactId ?? null,
        channel: "WHATSAPP",
        channelAccountId: waSettings.phoneId,
        phone: from,
      });
      if (handled) return;
    } catch (e) {
      log.error({ err: e }, "Error handling a shop reply");
    }
  }

  // ── A storefront shopper's confirmation code, from a prefilled wa.me link ────
  const textBody = (completeMessageObject as WaReceiveMessageBody)?.messages?.[0]?.text?.body;
  if (type === "text" && textBody?.toUpperCase().includes("RU-") && messageObj?.contactId) {
    try {
      const { confirmShopPhone, readVerifyCode } =
        await import("../../commerce/shop/phoneVerify.service.js");
      const code = readVerifyCode(textBody);
      if (
        code &&
        (await confirmShopPhone({
          orgId,
          contactId: messageObj.contactId,
          phone: from,
          code,
          channelAccountId: waSettings.phoneId,
        }))
      )
        return;
    } catch (e) {
      log.error({ err: e }, "Error confirming a shop phone code");
    }
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
    await notifyInboundMessage({
      orgId,
      contactId: messageObj?.contactId,
      contactName: userName ?? from,
      sourceIdentifier,
    });
  }

  if (loyaltyWaCommand) {
    await handleLoyaltyWaCommand(loyaltyReply, loyaltyWaCommand, sourceIdentifier);
  } else if (parseStartMessage(message)) {
    await handleStartMessage(orgId, waMessage);
  } else if (parsedMessage.type === "nfm_reply") {
    // ── Check if this is a catalog address flow response ──────────────────────
    const addressData = flowResponseStrings(parsedMessage.flowResponse);
    const flowToken = addressData?.flow_token as string | undefined;
    if (flowToken?.startsWith("shop:")) {
      try {
        const { handleShopAddressFlow } = await import("../../commerce/shop/checkout.service.js");
        const shopper = { orgId, contactId: messageObj?.contactId ?? null };
        if (await handleShopAddressFlow(flowToken.slice(5), addressData, shopper)) return;
      } catch (e) {
        log.error({ err: e }, "Error handling a shop address form");
      }
    }
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
  if (!(await canMessageContact(orgId, { platform: PlatformType.WHATSAPP, customerId: from }))) {
    log.warn({ orgId }, "Flow not sent: active contact limit reached for a new contact");
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

/** Runs the "came from an ad" rules for a click; true when one of them answered it. */
async function answerAdReferral(
  waSettings: Omit<WhatsappSettings, "accessToken_iv">,
  phone: string,
  referral: WaReferral,
): Promise<boolean> {
  if (referral.source_type !== "ad" || !referral.source_id) return false;
  try {
    const result = await checkAndExecuteRuleByTriggerEvent("WHATSAPP_AD_REFERRAL", {
      orgId: waSettings.orgId,
      phoneNumberId: waSettings.phoneId ?? undefined,
      phone,
      adReferral: {
        sourceId: referral.source_id,
        headline: referral.headline,
        sourceUrl: referral.source_url,
      },
      platform: "WHATSAPP",
    });
    return Boolean(result);
  } catch (error) {
    log.error({ err: error, adId: referral.source_id }, "Error running the ad referral rules");
    return false;
  }
}
