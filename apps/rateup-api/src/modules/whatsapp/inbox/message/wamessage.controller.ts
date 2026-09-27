import { FastifyReply, FastifyRequest } from "fastify";
import {
  NewWaMessageBody,
  PaginateQuerySchema,
  WaChatFilterQuerySchema,
  WaChatExportQuerySchema,
  WaChatExportConstraints,
  waChatExportConstraints,
  WaMediaFileByMediaIdBody,
  WaMessageAssignBody,
  AssignOwnerBody,
  BlockUserBody,
  FavoriteContactBody,
  SpamContactBody,
  ClearMentionsBody,
  ReopenConversationBody,
  GenerateInboxResponseBody,
  PrivateWaMessageBody,
  BulkWaMessageAssignBody,
  LogsQuery,
} from "./wamessage.schema.js";
import {
  addNewWaMessage,
  assignWaMessageToUser,
  clearMentionsForConversation,
  reopenConversation,
  exportWhatsapChats,
  filterChats,
  generateChatFilterData,
  getAssignedUserForContact,
  getContactsCountByInbox,
  getMediaFile,
  getWaMessagesByContactId,
  sendMediaMessages,
  markMessagesAsRead,
  sendContactMessage,
  sendLocationMessage,
  generateChatAnalytics,
  generateInboxResponse,
  createInternalWaMessage,
  createWaMessageOrgTeamMap,
  getWaMessageLogs,
  setConversationFavorite,
  setContactSpam,
} from "./wamessage.service.js";
import { ByContactIdParams } from "../../../contact/contact.schema.js";
import {
  createReactionMessage,
  createTextMessage,
  parseToWhatsAppFormat,
} from "../../whatsappSurvey/wasurvey.utils.js";
import { isMetaAiOriginated } from "../../../metaAgent/metaAgent.origin.js";
import {
  blockWhatsappUser,
  sendMessage,
  unblockWhatsappUser,
} from "../../whatsappSurvey/wasurvey.service.js";
import {
  deriveConversationSubject,
  extractMentions,
  handleWaReceivedImages,
  returnAppropriateTimeStamp,
} from "./wamessage.utils.js";
import { getTemplateByNameAndOrgId } from "../../messageTemplates/wa_templates.service.js";
import { log } from "../../../../utils/logger.js";
import { normalizeSourceIdentifier } from "../../../../utils/channelIdentifier.js";
import {
  getContactById,
  getOrCreateContactByIgsId,
  getOrCreateContactByPhone,
  getOrCreateContactByPsid,
  updateContactById,
} from "../../../contact/contact.service.js";
import { sendViaWstoOrgHandler } from "../../../org/ws/org.ws.controller.js";
import { writeXlsx } from "hucre/xlsx";
import { XlsxStreamWriter } from "hucre";
import { WaMessageAssignStatus } from "../../../../types/enums.js";
import { MetaAgentThreadOwner, PlatformType } from "../../../../../generated/prisma/client.js";
import { setMetaAgentThreadOwner } from "../../../metaAgent/metaAgent.threadOwner.js";
import { Role } from "../../../../../generated/prisma/client.js";
import { getIgUserDetailsFromMeta } from "../../instagram/instagram.service.js";
import {
  OutgoingTemplateComponent,
  OutgoingTemplatePayload,
  WaReceiveMessageBody,
  WaSendMessageBody,
} from "../../../../types/whatsapp.types.js";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../../../integrations/external/zapier/zapier.service.js";
import {
  checkIfFirstSendMessageInConversation,
  checkIfFirstUserSendMessageInConversation,
  getActiveConversationForContact,
  getLastCreatedConversationForContact,
  openConversationForContact,
  setConversationSubjectIfBlank,
  updateConversation,
} from "../../../contact/conversation/conversation.service.js";
import { recordMessageInWindow } from "../../metering/meteredConversation.service.js";
import { WaMessageClosedStatus } from "../../constants.js";
import { getFacebookUserDetailsFromMeta } from "../../facebook/facebook.service.js";
import { notifyInboundMessage } from "./inboundNotify.js";
import { assignConversationOwner } from "./assignOwner.service.js";
//this function automates the process of adding wa contacts and the associated messages to db
export async function handleWaMessages(
  type: "send" | "receive",
  messageBody: WaMessagePayload,
  from: string,
  orgId: string,
  sourcePlatform: PlatformType = PlatformType.WHATSAPP,
  sourceIdentifier: string | undefined,
  userName?: string,
  messageId?: string,
  userId?: string,
  failed: boolean = false,
  teamId: string | null = null,
  messageType: "INBOX" | "TEMPLATE" | "CAMPAIGN" | "AUTOMATED" | "FLOW" = "INBOX",
  isAutomated: boolean = false,
  externalApi: boolean = false,
  logs: WaGraphApiErrorDetail = {},
  /**
   * Campaign linkage, passed as an object so the 15 positional parameters above
   * stop growing. Delivery statuses are matched back to a participant through
   * `WaMessageCampaginParticipantMap` (see `bulkUpdateStatuses`), so a campaign
   * send that skips this row can never be reported on.
   */
  campaign?: {
    participantId: string;
    dripStageId?: string | null;
    templateData?: unknown;
    /** The send session (initial send or a specific retry) this message is part of. */
    campaignSendId?: string | null;
  },
) {
  try {
    /**
     * One spelling for the channel, for every path that reaches here.
     *
     * Callers arrive with whatever their source handed them — Meta's formatted
     * `display_phone_number`, a `WhatsappSettings.phone` with its `+` and
     * separators, or digits — and both columns written below are matched with
     * `=` elsewhere. Normalising at the single point every message is stored
     * through is what stops a new caller quietly adding a fifth spelling.
     * Instagram and Facebook account ids pass through untouched.
     */
    sourceIdentifier = normalizeSourceIdentifier(sourceIdentifier, sourcePlatform);

    // Prepare message body
    let waMessageBody: WaInboxMessageBody = {
      exchangeProcess: type,
      // The envelope's arms are the modelled shapes; a synthesized payload is stored
      // as-is (see WaMessagePayload).
      send: type === "send" ? (messageBody as WaInboxMessageBody["send"]) : undefined,
      receive: type === "receive" ? (messageBody as WaInboxMessageBody["receive"]) : undefined,
    };
    // Prepare contact core data
    const waTimeStamp = await returnAppropriateTimeStamp(waMessageBody, sourcePlatform);
    // Not typed as `ContactCore` (contactCoreSchema's inferred type): that schema
    // requires `name`, but this can genuinely run with no username (e.g. a plain
    // phone contact). This object only ever flows into
    // `Omit<updateContactSchema, "customFields">`-typed params below, where every
    // field is optional, so it's left to infer its own (accurate) shape instead.
    const contactCore = {
      name: userName,
      ...(sourcePlatform === PlatformType.WEBCHAT || sourcePlatform === PlatformType.FACEBOOK
        ? { other: from }
        : { phone: from }),
      psid: sourcePlatform === PlatformType.FACEBOOK ? from : undefined,
      igsId: sourcePlatform === PlatformType.INSTAGRAM ? from : undefined,
      source:
        sourcePlatform === PlatformType.WEBCHAT
          ? PlatformType.WEBCHAT
          : sourcePlatform?.toLowerCase(),
    };

    // Fetch additional Instagram data if needed
    let additionalData = {};
    if (sourcePlatform === PlatformType.INSTAGRAM && type === "receive" && sourceIdentifier) {
      try {
        const userDetails = await getIgUserDetailsFromMeta(from, sourceIdentifier);
        additionalData = {
          name: userDetails?.name ?? undefined,
          whatsappUserName: userDetails?.username ?? undefined,
          followerCount: userDetails?.follower_count,
          isIgVerifiedUser: userDetails?.is_verified_user,
        };
      } catch (e) {
        log.error({ err: e }, "Error getting Instagram user details");
      }
    }

    // Fetch additional Facebook data if needed
    if (sourcePlatform === PlatformType.FACEBOOK && type === "receive" && sourceIdentifier) {
      try {
        const userDetails = await getFacebookUserDetailsFromMeta(from, sourceIdentifier);
        additionalData = {
          name: userDetails?.name ?? undefined,
          email: userDetails?.email ?? undefined,
          profilePic: userDetails?.profile_pic ?? undefined,
        };
      } catch (e) {
        log.error({ err: e }, "Error getting Facebook user details");
      }
    }

    // Compose contact data
    const contactData = {
      ...(type === "receive" ? { lastReceivedMessageTimeStamp: waTimeStamp } : {}),
      ...(type === "send" ? { lastSentMessageTimeStamp: waTimeStamp } : {}),
      lastMessageBody: waMessageBody,
      lastMessageWaCreatedAt: waTimeStamp,
      lastMessagePlatform: sourcePlatform,
      ...(type === "receive"
        ? {
            // `messageBody` is the payload itself, not the { send, receive } envelope —
            // this used to read `.receive.metadata` and so was always null.
            lastReceivedMetadata:
              (messageBody as WaReceiveMessageBody | undefined)?.metadata || null,
          }
        : {}),
      lastMessageSourceIdentifier: sourceIdentifier,

      ...contactCore,
      ...additionalData,
    };

    // Get or create contact
    let res;
    if (sourcePlatform === PlatformType.INSTAGRAM) {
      res = await getOrCreateContactByIgsId(from, orgId, contactData, true);
    } else if (sourcePlatform === PlatformType.FACEBOOK) {
      // Facebook uses phone field but stores the Facebook User ID
      res = await getOrCreateContactByPsid(from, orgId, contactData, true);
    } else if (sourcePlatform === PlatformType.WEBCHAT) {
      res = await getOrCreateContactByPhone(from, orgId, contactData, PlatformType.WEBCHAT, true);
    } else {
      res = await getOrCreateContactByPhone(from, orgId, contactData, undefined, true);
    }
    // getOrCreateContactBy*() swallow their own errors and return `undefined`
    // instead of throwing (see contact.service.ts) — surface that here as a clear
    // error rather than crashing below with an opaque destructuring failure.
    if (!res) {
      throw new Error(`Failed to get or create contact for ${sourcePlatform} message from ${from}`);
    }
    let { contact, conversation } = res;
    // Prepare parameter data and handle specific cases
    let parameterData: OutgoingTemplateComponent[] | undefined;
    const sendBody = messageBody as WaSendMessageBody;
    if (type === "send" && sendBody?.type === "template" && sendBody.template) {
      const template = await getTemplateByNameAndOrgId(sendBody.template.name, orgId);
      if (!template) {
        throw new Error(`Template "${sendBody.template.name}" not found for org ${orgId}`);
      }
      parameterData = sendBody.template.components;
      // The stored row is the READ-BACK template (uppercase component names); the send
      // payload wants the create shape. Same values, different casing.
      (waMessageBody.send as WaSendMessageBody).template =
        template.data as unknown as OutgoingTemplatePayload;
    }

    if (type === "receive") {
      if (sourcePlatform === PlatformType.WHATSAPP) {
        waMessageBody = await handleWaReceivedImages(waMessageBody, orgId);
      }
      // A closed chat reopens when the customer writes back — unless they are a
      // spam contact, whose messages stay filed against the closed ticket instead
      // of resurfacing in the inbox. (Was a SPAM *status* check before spam moved
      // onto the contact.)
      if (!contact.isSpam && WaMessageClosedStatus.includes(contact.waMessageAssignStatus)) {
        contact = await updateContactById(contact.id, contact.orgId, {
          waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
        });
      }
    }
    if (!conversation) {
      if (
        type === "receive" &&
        contact.waMessageAssignStatus === WaMessageAssignStatus.UNASSIGNED
      ) {
        // An inbound message belongs to a live conversation. If the last one was
        // closed (or there was never one), this message opens a new conversation
        // rather than appending to a finished record.
        conversation =
          (await getActiveConversationForContact(contact.id)) ??
          (await openConversationForContact(contact.id, orgId));
      } else {
        // `getLastCreatedConversationForContact` signals "none" with `null`,
        // whereas this local `conversation` (destructured from
        // getOrCreateContactBy*'s own return shape) uses `undefined` for the
        // same absence — normalize so this function's later `conversation &&`
        // / `conversation?.` checks keep working regardless of which path set it.
        conversation = (await getLastCreatedConversationForContact(contact.id)) ?? undefined;
      }
    }

    // Attribute this message to its 24h metered window before the row is written,
    // so the id lands on the same insert instead of costing a second write.
    //
    // This is the one hook for the whole platform: every message in either
    // direction on every channel — inbound webhooks, agent replies, campaigns,
    // automated replies, Instagram, Messenger, webchat — funnels through
    // handleWaMessages, and this is the only place WaMessage rows are created.
    //
    // Deliberately not gated on the subscription limit: a customer's inbound
    // message is recorded and counted even when the org is over its allowance.
    // Enforcement blocks outbound sends instead (see wasurvey.auth.ts) — silently
    // dropping what a customer said is worse than an overage.
    const parsedTimeStamp = new Date(waTimeStamp);
    const meteredWindow = await recordMessageInWindow({
      orgId,
      platform: sourcePlatform,
      channelId: sourceIdentifier,
      customerId: from,
      contactId: contact.id,
      at: Number.isNaN(parsedTimeStamp.getTime()) ? new Date() : parsedTimeStamp,
      direction: type,
    });

    // Add new message to DB
    const waMessage = await addNewWaMessage(
      waMessageBody,
      contact.id,
      waTimeStamp,
      sourcePlatform,
      sourceIdentifier,
      conversation?.id,
      parameterData,
      messageId,
      userId,
      failed,
      messageType,
      logs,
      meteredWindow?.conversationId,
      // Campaign sends carry the participant they belong to, on the same INSERT
      // as the message. This used to be a second write straight after, and a
      // `sent` receipt processed in between matched the message, was acked, and
      // never counted against the campaign — see addNewWaMessage.
      campaign?.participantId
        ? {
            campaignParticipantId: campaign.participantId,
            campaignParticipantDripStageId: campaign.dripStageId,
            campaignSendId: campaign.campaignSendId,
          }
        : undefined,
    );

    // A ticket with no subject is titled by the message that opened it — the
    // first message is the best one-line description of what it is about. The
    // write itself is conditional on the subject still being blank, so a title an
    // agent typed is never overwritten, even if this copy of the row is stale.
    if (conversation && !conversation.subject) {
      const subject = deriveConversationSubject(waMessageBody);
      if (subject && (await setConversationSubjectIfBlank(conversation.id, subject))) {
        conversation = { ...conversation, subject };
      }
    }

    const teamID = teamId && teamId.trim() !== "" ? teamId : null;

    // add to wamessageorgteammap
    if (type === "send") {
      await createWaMessageOrgTeamMap({
        teamId: teamID,
        messageId: waMessage.id,
        orgId,
        isAutomedMessage: isAutomated,
        type: messageType,
        externalApi,
      });
    }

    if (type === "send" && conversation) {
      const isFirstSendMessage = await checkIfFirstSendMessageInConversation(
        conversation.id,
        waMessage.id,
      );
      if (isFirstSendMessage) {
        await updateConversation(conversation.id, contact.orgId, {
          firstRespondedAt: new Date(),
          firstRespondedByUserAt: userId ? new Date() : undefined,
        });
      } else {
        const isFirstUserSendMessage = await checkIfFirstUserSendMessageInConversation(
          conversation.id,
          waMessage.id,
        );
        if (isFirstUserSendMessage) {
          await updateConversation(conversation.id, contact.orgId, {
            firstRespondedByUserAt: new Date(),
          });
        }
      }
    }
    if (type === "receive")
      await addZapierTriggerToQueue(
        ZapierTriggers.NEW_MESSAGE,
        {
          [ZapierTriggers.NEW_MESSAGE]: {
            messageBody,
            messageId,
            sourcePlatform,
            sourceIdentifier,
            from,
          },
        },
        orgId,
      );
    // Meta hands the thread to whichever app sends, so any message RateUp
    // sends takes it off Meta AI — a staff reply, but equally an automation,
    // campaign, template, flow or API send. Marking only staff replies left
    // the inbox saying "Meta AI" while the agent had gone quiet. Not counted:
    // Meta AI's own replies stored from their echo (tagged bizai), and echoes
    // of messages typed in the WhatsApp Business app, which RateUp did not send.
    const takeoverReason = campaign
      ? "campaign"
      : isAutomated
        ? "automation"
        : userId
          ? "staff_reply"
          : externalApi
            ? "api_send"
            : messageType !== "INBOX"
              ? "automation"
              : null;
    const sentByMetaAi = isMetaAiOriginated(
      (messageBody as { biz_opaque_callback_data?: unknown } | null)?.biz_opaque_callback_data,
    );
    if (
      type === "send" &&
      takeoverReason &&
      !sentByMetaAi &&
      !failed &&
      sourcePlatform === PlatformType.WHATSAPP &&
      contact.phone &&
      contact.metaAgentThreadOwner === MetaAgentThreadOwner.AI
    ) {
      const now = new Date();
      try {
        const changed = await setMetaAgentThreadOwner({
          orgId,
          phone: contact.phone,
          owner: MetaAgentThreadOwner.STAFF,
          reason: takeoverReason,
          at: now,
        });
        if (changed) {
          contact = {
            ...contact,
            metaAgentThreadOwner: MetaAgentThreadOwner.STAFF,
            metaAgentThreadOwnerAt: now,
            metaAgentHandoverReason: takeoverReason,
          };
        }
      } catch (error) {
        log.error({ err: error, contactId: contact.id }, "Failed to mark a staff takeover");
      }
    }

    // WhatsApp notifies from its own webhook handler, after it has filtered out the bot's
    // self-service traffic; every other channel's inbound message lands only here.
    if (type === "receive" && sourcePlatform !== PlatformType.WHATSAPP && !failed) {
      await notifyInboundMessage({
        orgId,
        contactId: contact.id,
        contactName: contact.name ?? userName ?? from,
        sourceIdentifier,
      });
    }

    // Notify connected clients
    const inboxEvent = {
      type: "inbox" as const,
      inbox: {
        // The inbox list is ticket-grained, so the payload names the ticket
        // this message landed on. A bare Contact has no way to say which of
        // its tickets it means, and the client had to guess.
        contact: {
          ...contact,
          conversationId: conversation?.id ?? null,
          conversationStatus: conversation?.status ?? null,
        },
        message: waMessage,
      },
    };

    // A webchat thread has the visitor's widget on one end and the inbox on the other, so it
    // goes to both — `undefined` is "no filter" to the subscriber in org.ws.controller.
    //
    // The inbox sends to a webchat contact with `platform: WEBCHAT` (getContactPlatform), so
    // its own replies were recorded as WEBCHAT and this filter aimed them at `fab` alone: the
    // dashboard never saw an echo of the message it had just sent, and the thread fell back on
    // whatever the refetch happened to return. Inbound had the mirror-image problem, reaching
    // the widget and never the inbox. One thread, two ends, one broadcast.
    await sendViaWstoOrgHandler(
      orgId,
      inboxEvent,
      contact.source === PlatformType.WEBCHAT || sourcePlatform === PlatformType.WEBCHAT
        ? undefined
        : "main",
    );

    return waMessage;
  } catch (error) {
    // Logged and rethrown, not swallowed: this is the entry point for every inbound and
    // outbound message, and returning undefined made a lost message indistinguishable
    // from a stored one to every caller.
    log.error({ err: error }, "Error in handleWaMessages");
    throw error;
  }
}

export async function sendNewWaMessageHandler(
  request: FastifyRequest<{
    Body: NewWaMessageBody;
    Params: ByContactIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const { contactId } = request.params;
    const { type, contacts, location, whatsappSettingsPhoneId, platform, teamId } = request.body;
    const { orgId, userId } = request.user;
    if (!userId) {
      reply.status(401).send("User not found on request");
      return;
    }
    const contact = await getContactById(contactId, orgId);
    if (!contact) {
      log.error("Contact not found with id %s", contactId);
      reply.status(404).send("Contact not found");
      return;
    }
    let to;
    switch (platform) {
      case PlatformType.INSTAGRAM:
        to = contact.igsId;
        break;
      case PlatformType.FACEBOOK:
        to = contact.psid;
        break;
      case PlatformType.WEBCHAT:
        to = contact.other;
        break;
      default:
        to = contact.phone;
    }
    switch (type) {
      case "text": {
        const media = request.body.media;
        if (media?.length) {
          // `to` is the platform-resolved address (igsId / psid / other / phone). This
          // used to send captioned media to contact.phone while the bare-media branch
          // below used `to`, so on Instagram and Facebook the same image reached a
          // different address depending on whether it carried a caption.
          if (!to) {
            throw new Error(
              `No destination address found for contact ${contact.id} on ${platform}`,
            );
          }
          const text = request.body.text?.body;
          const caption = typeof text === "string" ? text : parseToWhatsAppFormat(text);
          await sendMediaMessages(
            media,
            to,
            orgId,
            userId,
            platform as PlatformType,
            caption,
            whatsappSettingsPhoneId,
            teamId,
          );
          break;
        }
        // `to` is nullable (the contact may lack the identifier this platform
        // needs, e.g. no igsId on an Instagram send) — a clear thrown error here
        // beats createTextMessage crashing on a non-string `to` further down.
        if (!to) {
          throw new Error(`No destination address found for contact ${contact.id} on ${platform}`);
        }
        const messageBody = createTextMessage(
          to,
          "",
          request?.body?.text?.body,
          platform as PlatformType,
        );
        await sendMessage(
          orgId,
          messageBody,
          undefined,
          userId,
          whatsappSettingsPhoneId,
          platform as PlatformType,
          undefined,
          teamId,
          "INBOX",
          false,
          false,
        );
        break;
      }
      case "reaction": {
        if (!to) {
          throw new Error(`No destination address found for contact ${contact.id} on ${platform}`);
        }
        const reactionBody = request.body.reaction;
        if (!reactionBody) {
          throw new Error("Reaction details not provided for reaction message");
        }
        const { emoji, toWaMessageId, reaction } = reactionBody;
        const messageBody = createReactionMessage(
          to,
          toWaMessageId,
          emoji,
          reaction,
          platform as PlatformType,
        );
        await sendMessage(
          orgId,
          messageBody,
          undefined,
          userId,
          whatsappSettingsPhoneId,
          platform as PlatformType,
          undefined,
          teamId,
          "INBOX",
          false,
          false,
        );
        break;
      }
      case "media":
        if (request.body.media?.length) {
          if (!to) {
            throw new Error(
              `No destination address found for contact ${contact.id} on ${platform}`,
            );
          }
          await sendMediaMessages(
            request.body.media,
            to,
            orgId,
            userId,
            platform as PlatformType,
            "",
            whatsappSettingsPhoneId,
            teamId,
          );
        }
        break;
      case "contact": {
        if (!contacts) {
          throw new Error("Contacts not provided for contact message");
        }
        if (!contact.phone) {
          throw new Error(`Contact ${contact.id} has no phone number for a contact-card send`);
        }
        await sendContactMessage(
          contacts,
          contact.phone,
          orgId,
          userId,
          whatsappSettingsPhoneId,
          teamId,
        );
        break;
      }
      case "location": {
        if (!location) {
          throw new Error("Location not provided for location message");
        }
        if (!contact.phone) {
          throw new Error(`Contact ${contact.id} has no phone number for a location send`);
        }
        // Meta's Cloud API expects numeric coordinates; the request body carries
        // them as strings (form-friendly), so they're converted here rather than
        // loosening WaSendMessageBody["location"]'s (accurate) numeric typing.
        await sendLocationMessage(
          {
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            name: location.name,
            address: location.address,
          },
          contact.phone,
          orgId,
          userId,
          whatsappSettingsPhoneId,
          teamId,
        );
        break;
      }
    }
    reply.send("Message Sent");
  } catch (error) {
    console.error(error);
    log.error({ err: error }, "Error in sendNewWaMessageHandler");
    reply.status(500).send("Internal Server Error");
  }
}

export async function getWaMessagesByContactIdHandler(
  request: FastifyRequest<{
    Params: ByContactIdParams;
    Querystring: PaginateQuerySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const cursor = request.query.cursor || null;
    // `phone` is optional on the query schema (`string | undefined`) — no `|| null`
    // fallback needed (and getWaMessagesByContactId's `phone` param doesn't accept
    // `null`, only `undefined`).
    const phone = request.query.phone || undefined;
    const conversationId = request.query.conversationId || null;
    const { contactId } = request.params;
    const messages = await getWaMessagesByContactId(contactId, cursor, phone, conversationId);
    reply.send(messages);
  } catch (error) {
    log.error(error);
    reply.status(500).send("Internal Server Error");
  }
}

export async function markMessagesAsReadHandler(
  request: FastifyRequest<{ Params: ByContactIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { userId } = request.user;
    if (!userId) {
      reply.status(401).send("User not found on request");
      return;
    }
    const res = await markMessagesAsRead(request.params.contactId, userId);
    reply.code(200).send(res);
  } catch (e) {
    reply.code(500).send(e);
  }
}

/** Explicit "clear @mention" action from the UI. Clears only the current user's
 *  unseen mentions on the given conversation. */
export async function clearConversationMentionsHandler(
  request: FastifyRequest<{
    Body: ClearMentionsBody;
    Params: ByContactIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const { userId } = request.user;
    if (!userId) {
      reply.status(401).send("User not found on request");
      return;
    }
    await clearMentionsForConversation(
      userId,
      request.params.contactId,
      request.body?.conversationId ?? null,
    );
    reply.code(200).send({ success: true });
  } catch (e) {
    log.error({ err: e }, "Error clearing mentions");
    reply.code(500).send("Internal Server Error");
  }
}

export async function reopenConversationHandler(
  request: FastifyRequest<{
    Body: ReopenConversationBody;
    Params: ByContactIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, userId } = request.user;
    if (!userId) {
      reply.status(401).send("User not found on request");
      return;
    }
    const res = await reopenConversation(
      orgId,
      userId,
      request.params.contactId,
      request.body?.conversationId ?? null,
      request.body?.messageId,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error({ err: e }, "Error reopening conversation");
    reply.code(500).send("Internal Server Error");
  }
}

export async function generateChatFilterDataHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const orgId = request.user.orgId;
    const chatFilters = await generateChatFilterData(orgId);
    if (chatFilters) {
      reply.status(200).send(chatFilters);
    } else {
      reply.status(500).send("Internal Server Error");
    }
  } catch (error) {
    log.error({ err: error }, "Error in generateChatFilterDataHandler");
    reply.status(500).send("Internal Server Error");
  }
}

export async function getFilteredContactsHandler(
  request: FastifyRequest<{
    Querystring: WaChatFilterQuerySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, userId, role } = request.user;
    if (!userId) {
      reply.status(401).send("User not found on request");
      return;
    }
    const { page, filterData } = request.query;
    // `page` is optional on the query schema; missing it previously fed `NaN`
    // silently into `filterChats`' offset math (Postgres would then error on the
    // NaN parameter, and `filterChats`'s own catch swallows that into `[]`) —
    // default to the first page instead.
    const pageNumber = parseInt(page ?? "1", 10);
    const contacts = await filterChats(
      orgId,
      pageNumber,
      JSON.parse(decodeURIComponent(filterData)),
      userId,
      request.actor!,
    );
    reply.status(200).send({
      rows: contacts ?? [],
      nextOffset: Array.isArray(contacts) && contacts.length > 0 ? pageNumber + 1 : null,
    });
  } catch (error) {
    console.log(error);
    reply.status(500).send("Internal Server Error");
  }
}
export async function getMediaFileByMediaId(
  request: FastifyRequest<{
    Params: WaMediaFileByMediaIdBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { mediaId } = request.params;
    const orgId = request.user.orgId;
    const media = await getMediaFile(mediaId, orgId);
    if (media?.data) {
      reply
        .status(200)
        .type(media.type as string)
        .send(media?.data);
    } else {
      reply.status(404).send("Media not found");
    }
  } catch (error) {
    log.error({ err: error }, "Error in getMediaFileByMediaId");
    reply.status(500).send("Internal Server Error");
  }
}

export async function exportWhatsappChatsHandler(
  request: FastifyRequest<{ Querystring: WaChatExportQuerySchema }>,
  reply: FastifyReply,
) {
  const { constraints, filterData } = request.query;
  if (constraints) {
    const orgId = request.user.orgId;

    let constraintsDecoded: WaChatExportConstraints;
    try {
      const parsed = waChatExportConstraints.safeParse(JSON.parse(decodeURIComponent(constraints)));
      if (!parsed.success) {
        return reply.status(400).send("Invalid export constraints");
      }
      constraintsDecoded = parsed.data;
    } catch {
      return reply.status(400).send("Invalid export constraints");
    }

    const filterfilterDataDecoded = JSON.parse(
      decodeURIComponent(filterData?.replace(/(^"|"$)/g, "")),
    );

    const writer = new XlsxStreamWriter({
      name: "Chats",
      columns: [
        { header: "Date", key: "date", autoWidth: true },
        { header: "From", key: "from", autoWidth: true },
        { header: "Name", key: "name", autoWidth: true },
        { header: "Message", key: "message", autoWidth: true },
      ],
    });

    const PAGE_SIZE = 5000;
    let offset = 0;
    while (true) {
      const page = await exportWhatsapChats(
        orgId,
        constraintsDecoded,
        filterfilterDataDecoded,
        PAGE_SIZE,
        offset,
      );
      for (const chat of page) {
        writer.addObject({
          date: chat.date,
          from: chat.from,
          name: chat.name,
          message: chat.sendbody ?? chat.receivebody ?? chat.templatename ?? "",
        });
      }
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const buffer = await writer.finish();
    reply.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    reply.header("Content-Disposition", "attachment; filename=export.xlsx");
    reply.send(buffer);
  } else {
    reply.status(400).send("Constraints not provided");
    return;
  }
}

export async function assignWaMessageHandler(
  request: FastifyRequest<{ Body: WaMessageAssignBody }>,
  reply: FastifyReply,
) {
  try {
    const res = await assignWaMessageToUser(request.body, request.user.orgId, request.user.userId);

    return reply.send(res);
  } catch (error) {
    log.error({ err: error }, "Error in assignWaMessageHandler");
    return reply.status(500).send("Internal Server Error");
  }
}

export async function assignConversationOwnerHandler(
  request: FastifyRequest<{ Body: AssignOwnerBody }>,
  reply: FastifyReply,
) {
  try {
    return reply.send(await assignConversationOwner(request.body, request.actor!));
  } catch (error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === "number" && statusCode < 500) {
      return reply.status(statusCode).send({ message: (error as Error).message });
    }
    log.error({ err: error }, "Error in assignConversationOwnerHandler");
    return reply.status(500).send("Internal Server Error");
  }
}

export async function getAssignedUserForContactHandler(
  request: FastifyRequest<{ Params: ByContactIdParams }>,
  reply: FastifyReply,
) {
  try {
    const res = await getAssignedUserForContact(request.params.contactId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getContactsCountByInboxTabHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId, userId, role } = request.user;
    if (!userId) {
      reply.status(401).send("User not found on request");
      return;
    }
    const res = await getContactsCountByInbox(orgId, userId, request.actor!);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function blockWhatsappUserHandler(
  request: FastifyRequest<{ Body: BlockUserBody }>,
  reply: FastifyReply,
) {
  try {
    const res = await blockWhatsappUser(request.user.orgId, request.body.phoneNumbersList);
    if (res.success) return reply.code(200).send();
    reply.code(400).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function unblockWhatsappUserHandler(
  request: FastifyRequest<{ Body: BlockUserBody }>,
  reply: FastifyReply,
) {
  try {
    const res = await unblockWhatsappUser(request.user.orgId, request.body.phoneNumbersList);
    if (res.success) return reply.code(200).send();
    reply.code(400).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

/**
 * Mark a contact as spam, or take them back out of it. Contact-grained — the body
 * carries a contactId, never a conversationId — because spam describes the person.
 */
export async function setContactSpamHandler(
  request: FastifyRequest<{ Body: SpamContactBody }>,
  reply: FastifyReply,
) {
  try {
    const res = await setContactSpam(
      request.user.orgId,
      request.body.contactId,
      request.body.isSpam,
      request.userId,
      request.body.messageId,
    );
    if (res.success) return reply.code(200).send(res);
    reply.code(404).send({ success: false, message: "Contact not found" });
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function setContactFavoriteHandler(
  request: FastifyRequest<{ Body: FavoriteContactBody }>,
  reply: FastifyReply,
) {
  try {
    const res = await setConversationFavorite(
      request.user.orgId,
      request.body.conversationId,
      request.body.isFavorite,
    );
    if (res.success) return reply.code(200).send(res);
    reply.code(404).send({ success: false, message: "Conversation not found" });
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function generateChatAnalyticsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const orgId = request.user.orgId;
    const analyticsData = await generateChatAnalytics(orgId);
    reply.status(200).send(analyticsData);
  } catch (error) {
    log.error({ err: error }, "Error in generateChatAnalyticsHandler");
    reply.status(500).send("Internal Server Error");
  }
}

export async function generateInboxResponseHandler(
  request: FastifyRequest<{ Body: GenerateInboxResponseBody }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, userId } = request.user;
    if (!userId) {
      reply.status(401).send("User not found on request");
      return;
    }

    const result = await generateInboxResponse(request.body, orgId, userId);

    reply.status(200).send(result);
  } catch (error) {
    log.error({ err: error }, "Error in generateInboxResponseHandler");
    reply.status(500).send("Internal Server Error");
  }
}

export async function createPrivateMessageHandler(
  request: FastifyRequest<{
    Body: PrivateWaMessageBody;
    Params: ByContactIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, userId } = request.user;
    const { contactId } = request.params;
    const body = request.body;
    let text = "";
    if (typeof body.text?.body === "string") {
      text = body.text.body;
    } else if (body.text?.body?.type === "doc") {
      text = parseToWhatsAppFormat(body.text.body);
    } else {
      throw new Error("Invalid text.body format");
    }
    const mentionedUsers = extractMentions(text);
    const res = await createInternalWaMessage({
      contactId: contactId,
      privateMessageText: text,
      trigerredByUser: userId,
      orgId: orgId,
      exchangeProcess: "privateNote",
      mentionedUsers: mentionedUsers,
      // Client sends explicit ids when the note came from the mention picker;
      // these win over the name-based `mentionedUsers` fallback below.
      mentionedUserIds: body.mentionedUserIds,
      // `messageId` is optional on the request body (used for optimistic client
      // ids) but required by createInternalWaMessage — same fallback used by its
      // other callers in wamessage.service.ts.
      messageId: body.messageId ?? crypto.randomUUID(),
    });
    reply.code(200).send(res);
  } catch (error) {
    log.error({ err: error }, "Error in creating private note");
    reply.status(500).send("Internal Server Error");
  }
}

export async function bulkAssignWaMessageHandler(
  request: FastifyRequest<{
    Body: BulkWaMessageAssignBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { contactIds, assignee, teamId, assignIfOnline, messageId } = request.body;

    // Guarded per contact so one failure does not abandon the rest: the caller gets a
    // per-contact outcome and can tell which conversations were actually assigned.
    const results = [];
    const failures = [];

    for (const contactId of contactIds) {
      try {
        const res = teamId
          ? await assignConversationOwner({ contactId, teamId }, request.actor!)
          : await assignWaMessageToUser(
              {
                contactId,
                assignees: assignee ? [assignee] : [],
                assignIfOnline: assignIfOnline ?? false,
                messageId,
              },
              request.user.orgId,
              request.userId,
            );

        results.push({ contactId, success: true, result: res });
      } catch (e) {
        log.error({ err: e, contactId }, "Error assigning chat in bulk assign");
        results.push({
          contactId,
          success: false,
          error: e instanceof Error ? e.message : "Something went wrong",
        });
        failures.push(contactId);
      }
    }

    return reply.code(200).send({
      message: failures.length
        ? `Assigned ${results.length - failures.length} of ${results.length} chats`
        : "Chats assigned successfully",
      assignedCount: results.length - failures.length,
      failedCount: failures.length,
      results,
    });
  } catch (error) {
    log.error(error);
    return reply.code(500).send({
      error: error instanceof Error ? error.message : "Something went wrong",
    });
  }
}

export async function getWaMessageLogsHandler(
  request: FastifyRequest<{
    Querystring: LogsQuery;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const dateRange = request.query.dateRange?.split(",") || [];
  const status = request.query?.status ?? "all";
  const sourceMessage = request.query?.source ?? "all";
  const team = request.query?.team ?? "all";
  const searchQuery = request.query?.searchQuery;

  // Pagination parameters
  const pageIndex = parseInt(request.query?.pageIndex ?? "0", 10);
  const pageSize = parseInt(request.query?.pageSize ?? "25", 10);
  const offset = pageIndex * pageSize;

  try {
    const res = await getWaMessageLogs(
      orgId,
      dateRange,
      status,
      sourceMessage,
      team,
      pageSize,
      offset,
      searchQuery,
    );
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching message logs");
    reply.status(500).send({
      error: "An error occurred while fetching the message logs.",
    });
  }
}

export async function exportWaMessageLogsHandler(
  request: FastifyRequest<{
    Querystring: LogsQuery;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const dateRange = request.query.dateRange?.split(",") || [];
  const status = request.query?.status ?? "all";
  const sourceMessage = request.query?.source ?? "all";
  const team = request.query?.team ?? "all";
  const searchQuery = request.query?.searchQuery;

  const limit = 50000;
  const offset = 0;

  try {
    const res = await getWaMessageLogs(
      orgId,
      dateRange,
      status,
      sourceMessage,
      team,
      limit,
      offset,
      searchQuery,
    );

    const excelData = res.data.map((row) => {
      let logsStr = "";
      try {
        logsStr = row.logs ? JSON.stringify(row.logs) : "";
      } catch {}

      let sourceLabel = row.sourceMessage || "Export";
      if (row.sourceMessage) {
        sourceLabel =
          row.sourceMessage.charAt(0).toUpperCase() + row.sourceMessage.slice(1).toLowerCase();
      }

      return {
        timestamp: row.createdAt ? new Date(row.createdAt).toLocaleString() : "",
        phone: row.phone || "",
        status: row.status || "",
        source: sourceLabel,
        type: row.messageType || "",
        message: row.messagePreview || "",
        logs: logsStr.replace(/\n/g, " ").substring(0, 32000),
      };
    });

    const buffer = await writeXlsx({
      sheets: [
        {
          name: "Message_Logs",
          columns: [
            { header: "Timestamp", key: "timestamp", autoWidth: true },
            { header: "Phone", key: "phone", autoWidth: true },
            { header: "Status", key: "status", autoWidth: true },
            { header: "Source", key: "source", autoWidth: true },
            { header: "Type", key: "type", autoWidth: true },
            { header: "Message", key: "message", autoWidth: true },
            { header: "Logs", key: "logs", autoWidth: true },
          ],
          data: excelData,
        },
      ],
    });
    reply.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    reply.header("Content-Disposition", "attachment; filename=message_logs.xlsx");
    reply.send(buffer);
  } catch (e) {
    log.error({ err: e }, "Error exporting message logs");
    reply.status(500).send({
      error: "An error occurred while exporting the message logs.",
    });
  }
}
