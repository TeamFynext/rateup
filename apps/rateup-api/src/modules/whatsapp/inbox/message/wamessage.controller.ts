import { FastifyReply, FastifyRequest } from "fastify";
import {
  NewWaMessageBody,
  PaginateQuerySchema,
  WaChatFilterQuerySchema,
  WaChatExportQuerySchema,
  WaChatExportConstraints,
  WaMediaFileByMediaIdBody,
  WaMessageAssignBody,
  BlockUserBody,
  FavoriteContactBody,
  ClearMentionsBody,
  GenerateInboxResponseBody,
  PrivateWaMessageBody,
  BulkWaMessageAssignBody,
  LogsQuery,
} from "./wamessage.schema.js";
import {
  addNewWaMessage,
  assignWaMessageToUser,
  clearMentionsForConversation,
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
} from "./wamessage.service.js";
import { ByContactIdParams, ContactCore } from "../../../contact/contact.schema.js";
import {
  createReactionMessage,
  createTextMessage,
  parseToWhatsAppFormat,
} from "../../whatsappSurvey/wasurvey.utils.js";
import {
  blockWhatsappUser,
  sendMessage,
  unblockWhatsappUser,
} from "../../whatsappSurvey/wasurvey.service.js";
import {
  extractMentions,
  handleWaReceivedImages,
  returnAppropriateTimeStamp,
} from "./wamessage.utils.js";
import { getTemplateByNameAndOrgId } from "../../messageTemplates/wa_templates.service.js";
import { log } from "../../../../utils/logger.js";
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
import { PlatformType } from "../../../../../generated/prisma/client.js";
import { Role } from "../../../../utils/enums/index.js";
import { getIgUserDetailsFromMeta } from "../../instagram/instagram.service.js";
import { WaSendMessageBody } from "../../../../types/whatsapp.types.js";
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
  updateConversation,
} from "../../../contact/conversation/conversation.service.js";
import { WaMessageClosedStatus } from "../../constants.js";
import { getFacebookUserDetailsFromMeta } from "../../facebook/facebook.service.js";
//this function automates the process of adding wa contacts and the associated messages to db
export async function handleWaMessages(
  type: "send" | "receive",
  messageBody: any,
  from: string,
  orgId: string,
  sourcePlatform: PlatformType = PlatformType.WHATSAPP,
  sourceIdentifier: string,
  userName?: string,
  messageId?: string,
  userId?: string,
  failed: boolean = false,
  teamId: string | null = null,
  messageType: "INBOX" | "TEMPLATE" | "CAMPAIGN" | "AUTOMATED" | "FLOW" = "INBOX",
  isAutomated: boolean = false,
  externalApi: boolean = false,
  logs = {},
) {
  try {
    // Prepare message body
    let waMessageBody: WaInboxMessageBody = {
      exchangeProcess: type,
      send: type === "send" ? messageBody : null,
      receive: type === "receive" ? messageBody : null,
    };
    // Prepare contact core data
    const waTimeStamp = await returnAppropriateTimeStamp(waMessageBody, sourcePlatform);
    const contactCore: ContactCore = {
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
    if (sourcePlatform === PlatformType.INSTAGRAM && type === "receive") {
      try {
        const userDetails = await getIgUserDetailsFromMeta(from, sourceIdentifier);
        additionalData = {
          name: userDetails?.name ?? undefined,
          whatsappUserName: userDetails?.username ?? undefined,
          followerCount: userDetails?.follower_count,
          isIgVerifiedUser: userDetails?.is_verified_user,
        };
      } catch (e) {
        log.error("Error getting Instagram user details: %o", e);
      }
    }

    // Fetch additional Facebook data if needed
    if (sourcePlatform === PlatformType.FACEBOOK && type === "receive") {
      try {
        const userDetails = await getFacebookUserDetailsFromMeta(from, sourceIdentifier);
        additionalData = {
          name: userDetails?.name ?? undefined,
          email: userDetails?.email ?? undefined,
          profilePic: userDetails?.profile_pic ?? undefined,
        };
      } catch (e) {
        log.error("Error getting Facebook user details: %o", e);
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
            lastReceivedMetadata: messageBody?.receive?.metadata || null,
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
    let { contact, conversation } = res;
    // Prepare parameter data and handle specific cases
    let parameterData = {};
    if (type === "send" && messageBody?.type === "template") {
      const template = await getTemplateByNameAndOrgId(messageBody.template.name, orgId);
      parameterData = messageBody.template.components;
      (waMessageBody.send as WaSendMessageBody).template = template.data as any;
    }

    if (type === "receive") {
      if (sourcePlatform === PlatformType.WHATSAPP) {
        waMessageBody = await handleWaReceivedImages(waMessageBody, orgId);
      }
      if (
        contact.waMessageAssignStatus !== WaMessageAssignStatus.SPAM &&
        WaMessageClosedStatus.includes(contact.waMessageAssignStatus)
      ) {
        contact = await updateContactById(contact.id, {
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
        conversation = await getLastCreatedConversationForContact(contact.id);
      }
    }

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
    );

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
        await updateConversation(conversation.id, {
          firstRespondedAt: new Date(),
          firstRespondedByUserAt: userId ? new Date() : undefined,
        });
      } else {
        const isFirstUserSendMessage = await checkIfFirstUserSendMessageInConversation(
          conversation.id,
          waMessage.id,
        );
        if (isFirstUserSendMessage) {
          await updateConversation(conversation.id, {
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
    // Notify connected clients
    await sendViaWstoOrgHandler(
      orgId,
      {
        type: "inbox",
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
      },
      sourcePlatform === PlatformType.WEBCHAT ? "fab" : "main",
    );

    return waMessage;
  } catch (error) {
    log.error("Error in handleWaMessages: %o", error);
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
    const contact = await getContactById(contactId);
    let to;
    switch (platform) {
      case PlatformType.INSTAGRAM:
        to = contact?.igsId;
        break;
      case PlatformType.FACEBOOK:
        to = contact?.psid;
        break;
      case PlatformType.WEBCHAT:
        to = contact?.other;
        break;
      default:
        to = contact?.phone;
    }
    if (!contact) {
      log.error("Contact not found with id %s", contactId);
      reply.status(404).send("Contact not found");
      return;
    }
    switch (type) {
      case "text": {
        const media = request.body.media;
        if (media.length) {
          const text = request.body.text.body;
          const caption = typeof text === "string" ? text : parseToWhatsAppFormat(text);
          await sendMediaMessages(
            media,
            contact.phone,
            orgId,
            userId,
            platform as PlatformType,
            caption,
            whatsappSettingsPhoneId,
            teamId,
          );
          break;
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
        const { emoji, toWaMessageId, reaction } = request.body.reaction;
        const messageBody = createReactionMessage(to, toWaMessageId, emoji, reaction, platform);
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
        if (request.body.media.length)
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
        break;
      case "contact": {
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
      case "location":
        await sendLocationMessage(
          location,
          contact.phone,
          orgId,
          userId,
          whatsappSettingsPhoneId,
          teamId,
        );
        break;
    }
    reply.send("Message Sent");
  } catch (error) {
    console.error(error);
    log.error("Error in sendNewWaMessageHandler: %o", error);
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
    const phone = request.query.phone || null;
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
    const res = await markMessagesAsRead(request.params.contactId, request.user.userId);
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
    await clearMentionsForConversation(
      request.user.userId,
      request.params.contactId,
      request.body?.conversationId ?? null,
    );
    reply.code(200).send({ success: true });
  } catch (e) {
    log.error("Error clearing mentions: %o", e);
    reply.code(500).send("Internal Server Error");
  }
}

export async function generateChatFilterDataHandler(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.user.orgId;
  const chatFilters = await generateChatFilterData(orgId);
  if (chatFilters) {
    reply.status(200).send(chatFilters);
  } else {
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
    const { page, filterData } = request.query;
    const contacts = await filterChats(
      orgId,
      parseInt(page),
      JSON.parse(decodeURIComponent(filterData)),
      userId,
      role as Role,
    );
    reply.status(200).send({
      rows: contacts ?? [],
      nextOffset: Array.isArray(contacts) && contacts.length > 0 ? parseInt(page) + 1 : null,
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
    log.error("Error in getMediaFileByMediaId: %o", error);
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

    const constraintsDecoded: WaChatExportConstraints = JSON.parse(decodeURIComponent(constraints));

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
  const res = await assignWaMessageToUser(request.body, request.user.orgId, request.user.userId);

  return reply.send(res);
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
    const res = await getContactsCountByInbox(
      request.user.orgId,
      request.user.userId,
      request.user.role,
    );
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
    log.error("Error in generateChatAnalyticsHandler: %o", error);
    reply.status(500).send("Internal Server Error");
  }
}

export async function generateInboxResponseHandler(
  request: FastifyRequest<{ Body: GenerateInboxResponseBody }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, userId } = request.user;

    const result = await generateInboxResponse(request.body, orgId, userId);

    reply.status(200).send(result);
  } catch (error) {
    log.error("Error in generateInboxResponseHandler: %o", error);
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
      messageId: body.messageId,
    });
    reply.code(200).send(res);
  } catch (error) {
    log.error("Error in creating private note: %o", error);
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
    const { contactIds, assignee, assignIfOnline, messageId } = request.body;

    const results = [];

    for (const contactId of contactIds) {
      const res = await assignWaMessageToUser(
        {
          contactId,
          assignees: [assignee],
          assignIfOnline: assignIfOnline ?? false,
          messageId,
        },
        request.user.orgId,
        request.userId,
      );

      results.push(res);
    }

    return reply.code(200).send({
      message: "Chats assigned successfully",
      assignedCount: results.length,
      results,
    });
  } catch (error) {
    log.error(error);
    return reply.code(500).send({
      error: error?.message || "Something went wrong",
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
    log.error("Error fetching message logs :%o", e);
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
    log.error("Error exporting message logs :%o", e);
    reply.status(500).send({
      error: "An error occurred while exporting the message logs.",
    });
  }
}
