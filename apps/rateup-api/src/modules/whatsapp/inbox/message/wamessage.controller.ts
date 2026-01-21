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
  GenerateInboxResponseBody,
  PrivateWaMessageBody,
} from "./wamessage.schema.js";
import {
  addNewWaMessage,
  assignWaMessageToUser,
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
} from "./wamessage.service.js";
import {
  ByContactIdParams,
  ContactCore,
} from "../../../contact/contact.schema.js";
import {
  createReactionMessage,
  createTextMessage,
  parseToWhatsAppFormat,
  validateSession,
} from "../../whatsappSurvey/wasurvey.utils.js";
import {
  blockWhatsappUser,
  createSession,
  deleteSession,
  getSession,
  sendMessage,
  unblockWhatsappUser,
} from "../../whatsappSurvey/wasurvey.service.js";
import {
  extractMentions,
  handleWaReceivedImages,
  isSessionExpired,
  returnAppropriateTimeStamp,
} from "./wamessage.utils.js";
import { getTemplateByNameAndOrgId } from "../../messageTemplates/wa_templates.service.js";
import { log } from "../../../../utils/logger.js";
import {
  getContactById,
  getOrCreateContactByIgsId,
  getOrCreateContactByPhone,
  updateContactById,
} from "../../../contact/contact.service.js";
import { sendViaWstoOrgHandler } from "../../../org/ws/org.ws.controller.js";
import xlsx from "node-xlsx";
import { WaMessageAssignStatus } from "../../../../types/enums.js";
import {
  Contact,
  PlatformType,
} from "../../../../../generated/prisma/client.js";
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
  createConversation,
  getLastCreatedConversationForContact,
  updateConversation,
} from "../../../contact/conversation/conversation.service.js";
import { WaMessageClosedStatus } from "../../constants.js";
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
) {
  try {
    // Prepare message body
    let waMessageBody: WaInboxMessageBody = {
      exchangeProcess: type,
      send: type === "send" ? messageBody : null,
      receive: type === "receive" ? messageBody : null,
    };

    // Prepare contact core data
    const waTimeStamp = await returnAppropriateTimeStamp(
      waMessageBody,
      sourcePlatform,
    );
    const contactCore: ContactCore = {
      name: userName,
      ...(sourcePlatform === PlatformType.WEBCHAT
        ? { other: from }
        : { phone: from }),
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
        const userDetails = await getIgUserDetailsFromMeta(
          from,
          sourceIdentifier,
        );
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

    // Compose contact data
    const contactData = {
      ...(type === "receive"
        ? { lastReceivedMessageTimeStamp: waTimeStamp }
        : {}),
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
    } else if (sourcePlatform === PlatformType.WEBCHAT) {
      res = await getOrCreateContactByPhone(
        from,
        orgId,
        contactData,
        PlatformType.WEBCHAT,
        true,
      );
    } else {
      res = await getOrCreateContactByPhone(
        from,
        orgId,
        contactData,
        undefined,
        true,
      );
    }
    let { contact, conversation } = res;
    // Prepare parameter data and handle specific cases
    let parameterData = {};
    if (type === "send" && messageBody?.type === "template") {
      const template = await getTemplateByNameAndOrgId(
        messageBody.template.name,
        orgId,
      );
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
      conversation = await getLastCreatedConversationForContact(contact.id);
      if (
        !conversation &&
        type === "receive" &&
        contact.waMessageAssignStatus === WaMessageAssignStatus.UNASSIGNED
      ) {
        conversation = await createConversation({
          contactId: contact.id,
        });
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
    );
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
        const isFirstUserSendMessage =
          await checkIfFirstUserSendMessageInConversation(
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
          contact,
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
    const { type, contacts, location, whatsappSettingsPhoneId, platform } =
      request.body;
    const { orgId, userId } = request.user;
    const contact = await getContactById(contactId);
    let to;
    switch (platform) {
      case PlatformType.INSTAGRAM:
        to = contact?.igsId;
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
          const caption =
            typeof text === "string" ? text : parseToWhatsAppFormat(text);
          await sendMediaMessages(
            media,
            contact.phone,
            orgId,
            userId,
            caption,
            whatsappSettingsPhoneId,
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
        );
        break;
      }
      case "reaction": {
        const { emoji, toWaMessageId, reaction } = request.body.reaction;
        const messageBody = createReactionMessage(
          to,
          toWaMessageId,
          emoji,
          reaction,
          platform,
        );
        await sendMessage(
          orgId,
          messageBody,
          undefined,
          userId,
          whatsappSettingsPhoneId,
          platform as PlatformType,
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
          );
        break;
      case "contact": {
        await sendContactMessage(
          contacts,
          contact.phone,
          orgId,
          userId,
          whatsappSettingsPhoneId,
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
    const { contactId } = request.params;
    const messages = await getWaMessagesByContactId(contactId, cursor, phone);
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
    const res = await markMessagesAsRead(
      request.params.contactId,
      request.user.userId,
    );
    reply.code(200).send(res);
  } catch (e) {
    reply.code(500).send(e);
  }
}

export async function generateChatFilterDataHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
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
      nextOffset:
        Array.isArray(contacts) && contacts.length > 0
          ? parseInt(page) + 1
          : null,
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
      reply.status(200).type(media.type).send(media?.data);
    } else {
      reply.status(404).send("Media not found");
    }
  } catch (error) {
    reply.status(500).send("Internal Server Error");
  }
}

export async function exportWhatsappChatsHandler(
  request: FastifyRequest<{ Querystring: WaChatExportQuerySchema }>,
  reply: FastifyReply,
) {
  const { constraints, filterData } = request.query;
  if (!constraints) {
    reply.status(400).send("Constraints not provided");
    return;
  } else {
    const orgId = request.user.orgId;

    const constraintsDecoded: WaChatExportConstraints = JSON.parse(
      decodeURIComponent(constraints),
    );

    const filterfilterDataDecoded = JSON.parse(
      decodeURIComponent(filterData?.replace(/(^"|"$)/g, "")),
    );
    const dataToExport = await exportWhatsapChats(
      orgId,
      constraintsDecoded,
      filterfilterDataDecoded,
    );
    const _excelData = dataToExport.map((chat) => {
      return [
        chat.date,
        chat.from,
        chat.name,
        chat.sendbody ?? chat.receivebody ?? chat.templatename ?? "",
      ];
    });
    const excelData = [["Date", "From", "Name", "Message"], ..._excelData];
    const buffer = xlsx.build([
      { name: "Chats", data: excelData, options: {} },
    ]);
    reply.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    reply.header("Content-Disposition", "attachment; filename=export.xlsx");
    reply.send(buffer);
  }
}

export async function assignWaMessageHandler(
  request: FastifyRequest<{ Body: WaMessageAssignBody }>,
  reply: FastifyReply,
) {
  try {
    const res = await assignWaMessageToUser(
      request.body,
      request.user.orgId,
      request.user.userId,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
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
    const res = await blockWhatsappUser(
      request.user.orgId,
      request.body.phoneNumbersList,
    );
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
    const res = await unblockWhatsappUser(
      request.user.orgId,
      request.body.phoneNumbersList,
    );
    if (res.success) return reply.code(200).send();
    reply.code(400).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function generateChatAnalyticsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
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

    await generateInboxResponse(request.body, orgId, userId);

    // Generate response logic here
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
      messageId: body.messageId,
    });
    reply.code(200).send(res);
  } catch (error) {
    log.error("Error in creating private note: %o", error);
    reply.status(500).send("Internal Server Error");
  }
}
