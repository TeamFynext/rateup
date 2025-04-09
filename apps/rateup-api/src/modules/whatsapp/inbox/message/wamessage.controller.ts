import { FastifyReply, FastifyRequest } from "fastify";
import {
  NewWaMessageBody,
  PaginateQuerySchema,
  WaChatFilterQuerySchema,
  WaChatExportQuerySchema,
  WaChatExportConstraints,
  WaMediaFileByMediaIdBody,
  WaMessageAssignBody,
} from "./wamessage.schema";
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
  getWaTickets,
  sendMediaMessages,
} from "./wamessage.service";
import {
  ByContactIdParams,
  ContactCore,
} from "../../../contact/contact.schema";
import {
  createReactionMessage,
  createTextMessage,
  parseToWhatsAppFormat,
  validateSession,
} from "../../whatsappSurvey/wasurvey.utils";
import {
  createSession,
  deleteSession,
  getSession,
  sendMessage,
} from "../../whatsappSurvey/wasurvey.service";
import {
  handleWaReceivedImages,
  isSessionExpired,
  returnAppropriateTimeStamp,
} from "./wamessage.utils";
import { getTemplateByNameAndOrgId } from "../../messageTemplates/wa_templates.service";
import { log } from "../../../../utils/logger";
import {
  getContactById,
  getOrCreateContactByPhone,
  updateContactById,
} from "../../../contact/contact.service";
import { sendViaWstoOrgHandler } from "../../../org/ws/org.ws.controller";
import xlsx from "node-xlsx";
import fs from "fs";
import { WaMessageAssignStatus } from "../../../../types/enums";
//this function automates the process of adding wa contacts and the associated messages to db
export async function handleWaMessages(
  type: "send" | "receive",
  messageBody: any,
  phone: string,
  orgId: string,
  userName?: string,
  messageId?: string,
  userId?: string,
) {
  try {
    // Create the message body
    let waMessageBody: WaInboxMessageBody = {
      exchangeProcess: type,
      send: type === "send" ? messageBody : null,
      receive: type === "receive" ? messageBody : null,
    };
    // Create the contact core
    const contactCore: ContactCore = {
      name: userName,
      phone: phone,
      source: "whatsapp",
    };
    // create contact if it does not exist
    const contact = await getOrCreateContactByPhone(phone, orgId, contactCore);

    let parameterData = {};
    switch (type) {
      case "send": {
        //condition to add template body to messageData if type is template
        if (messageBody?.type === "template") {
          const template = await getTemplateByNameAndOrgId(
            messageBody.template.name,
            orgId,
          );
          parameterData = messageBody.template.components;
          waMessageBody.send.template = template.data as unknown as any;
        }
      }
      case "receive": {
        waMessageBody = await handleWaReceivedImages(waMessageBody, orgId);
      }
    }
    const waTimeStamp = await returnAppropriateTimeStamp(waMessageBody);

    if (type === "receive") {
      const isChangeStatus =
        isSessionExpired(contact.lastReceivedMessageTimeStamp) &&
        contact.waMessageAssignStatus === WaMessageAssignStatus.CLOSED;
      await updateContactById(contact.id, {
        waMessageAssignStatus: isChangeStatus
          ? WaMessageAssignStatus.UNASSIGNED
          : undefined,
        lastReceivedMessageTimeStamp: waTimeStamp,
      });
    }

    const waMessage = await addNewWaMessage(
      waMessageBody,
      contact.id,
      waTimeStamp,
      parameterData,
      messageId,
      userId,
    );

    // Send the message to the connected clients
    await sendViaWstoOrgHandler(orgId, {
      type: "inbox",
      inbox: {
        contact: contact,
        message: waMessage,
      },
    });
  } catch (error) {
    log.error("Error in handleWaMessages: %o", error);
    log.error(error);
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
    const { type } = request.body;
    const { orgId, userId } = request.user;
    const contact = await getContactById(contactId);
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
          await sendMediaMessages(media, contact.phone, orgId, userId, caption);
          break;
        }
        const messageBody = createTextMessage(
          contact.phone,
          "",
          request?.body?.text?.body,
        );
        await sendMessage(orgId, messageBody, null, userId);
        break;
      }
      case "reaction":
        const { emoji, toWaMessageId } = request.body.reaction;
        const messageBody = createReactionMessage(
          contact.phone,
          toWaMessageId,
          emoji,
        );
        await sendMessage(orgId, messageBody, null, userId);
        break;
      case "media":
        if (request.body.media.length)
          await sendMediaMessages(
            request.body.media,
            contact.phone,
            orgId,
            userId,
          );
        break;
    }
    reply.send("Message Sent");
  } catch (error) {
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
    const { contactId } = request.params;
    const messages = await getWaMessagesByContactId(contactId, cursor);
    reply.send(messages);
  } catch (error) {
    reply.status(500).send("Internal Server Error");
  }
}

export async function getWaTicketsHandler(
  request: FastifyRequest<{
    Querystring: PaginateQuerySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { page } = request.query;
    const orgId = request.user.orgId;
    const tickets = await getWaTickets(parseInt(page), orgId);
    reply.send({
      rows: tickets,
      nextOffset: tickets?.data?.length > 0 ? parseInt(page) + 1 : null,
    });
  } catch (error) {
    reply.status(500).send("Internal Server Error");
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
    const { orgId, userId } = request.user;
    const { page, filterData } = request.query;
    const contacts = await filterChats(
      orgId,
      parseInt(page),
      JSON.parse(decodeURIComponent(filterData)),
      userId,
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
    const filterfilterDataDecoded = JSON.parse(decodeURIComponent(filterData));
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
    const res = await assignWaMessageToUser(request.body);
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
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
