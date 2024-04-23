import { FastifyReply, FastifyRequest } from "fastify";
import { NewWaMessageBody } from "./wamessage.schema";
import {
  addNewWaMessage,
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
import { handleSendWsMessage } from "./wamessage.ws.controller";
import {
  getContactById,
  getOrCreateContactByPhone,
} from "../../../contact/contact.service";

//this function automates the process of adding wa contacts and the associated messages to db
export async function handleWaMessages(
  type: "send" | "receive",
  messageBody: any,
  phone: string,
  orgId: string,
  userName?: string,
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
    );

    // Send the message to the connected clients
    await handleSendWsMessage(orgId, {
      contact: contact,
      message: waMessage,
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
  request: FastifyRequest<{ Params: ByContactIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { contactId } = request.params;
    const messages = await getWaMessagesByContactId(contactId);
    reply.send(messages);
  } catch (error) {
    reply.status(500).send("Internal Server Error");
  }
}

export async function getContactsWithLastMessageHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const contacts = await getContactsWithLastMessage(orgId);
    reply.send(contacts);
  } catch (error) {
    reply.status(500).send("Internal Server Error");
  }
}
