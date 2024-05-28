import { FastifyReply, FastifyRequest } from "fastify";
import {
  NewWaMessageBody,
  PaginateQuerySchema,
  WaChatFilterSchema,
  WaChatFilterQuerySchema,
} from "./wamessage.schema";
import {
  addNewWaMessage,
  filterChats,
  generateChatFilterData,
  getContactsWithLastMessage,
  getWaMessagesByContactId,
} from "./wamessage.service";
import {
  ByContactIdParams,
  ContactCore,
} from "../../../contact/contact.schema";
import { createTextMessage } from "../../whatsappSurvey/wasurvey.utils";
import { sendMessage } from "../../whatsappSurvey/wasurvey.service";
import {
  handleWaReceivedImages,
  returnAppropriateTimeStamp,
} from "./wamessage.utils";
import { getTemplateByNameAndOrgId } from "../../messageTemplates/wa_templates.service";
import { log } from "../../../../utils/logger";
import {
  getContactById,
  getOrCreateContactByPhone,
} from "../../../contact/contact.service";
import { sendViaWstoOrgHandler } from "../../../org/ws/org.ws.controller";

//this function automates the process of adding wa contacts and the associated messages to db
export async function handleWaMessages(
  type: "send" | "receive",
  messageBody: any,
  phone: string,
  orgId: string,
  userName?: string,
  messageId?: string,
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
          waMessageBody.send.template = template.data;
        }
      }
      case "receive": {
        waMessageBody = await handleWaReceivedImages(waMessageBody, orgId);
      }
    }
    const waTimeStamp = await returnAppropriateTimeStamp(waMessageBody);

    const waMessage = await addNewWaMessage(
      waMessageBody,
      contact.id,
      waTimeStamp,
      parameterData,
      messageId,
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
    log.error("Error in handleWaMessages: ", error);
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
    const { orgId } = request.user;
    const contact = await getContactById(contactId);
    if (!contact) {
      log.error("Contact not found with id %s", contactId);
      reply.status(404).send("Contact not found");
      return;
    }
    switch (type) {
      case "text": {
        const messageBody = createTextMessage(
          contact.phone,
          "",
          request?.body?.text?.body,
        );
        await sendMessage(orgId, messageBody);
      }
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

export async function getContactsWithLastMessageHandler(
  request: FastifyRequest<{ Querystring: PaginateQuerySchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { page } = request.query;
    const contacts = await getContactsWithLastMessage(orgId, parseInt(page));
    reply.status(200).send(contacts);
  } catch (error) {
    console.log(error);
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
    const { orgId } = request.user;
    const { page, filterData } = request.query;
    const contacts = await filterChats(
      orgId,
      parseInt(page),
      JSON.parse(decodeURIComponent(filterData)),
    );
    reply.status(200).send(contacts);
  } catch (error) {
    console.log(error);
    reply.status(500).send("Internal Server Error");
  }
}
