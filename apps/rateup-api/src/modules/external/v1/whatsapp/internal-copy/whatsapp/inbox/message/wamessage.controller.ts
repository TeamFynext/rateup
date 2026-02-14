import { FastifyReply, FastifyRequest } from "fastify";
import { NewWaMessageBody, PaginateQuerySchema } from "./wamessage.schema.js";
import {
  addNewWaMessage,
  getContactsWithLastMessage,
  getWaMessagesByContactId,
} from "./wamessage.service.js";
import { createTextMessage } from "../../whatsappSurvey/wasurvey.utils.js";
import { sendMessage } from "../../whatsappSurvey/wasurvey.service.js";
import {
  handleWaReceivedImages,
  returnAppropriateTimeStamp,
} from "./wamessage.utils.js";
import { getTemplateByNameAndOrgId } from "../../messageTemplates/wa_templates.service.js";
import { log } from "../../../../../../../../utils/logger.js";
import { sendViaWstoOrgHandler } from "../../../../../../../org/ws/org.ws.controller.js";
import {
  ByContactIdParams,
  ContactCore,
} from "../../../../../contact/internal-copy/contact/contact.schema.js";
import {
  getContactById,
  getOrCreateContactByPhone,
} from "../../../../../contact/internal-copy/contact/contact.service.js";
import { WaSendMessageBody } from "../../../../../../../../types/whatsapp.types.js";
import { createWaMessageOrgTeamMap } from "../../../../../../../whatsapp/inbox/message/wamessage.service.js";

//this function automates the process of adding wa contacts and the associated messages to db
export async function handleWaMessages(
  type: "send" | "receive",
  messageBody: any,
  teamId: string,
  phone: string,
  orgId: string,
  userName?: string,
  messageId?: string,
  userId?: string,
  failed: boolean = false,
  isAutomated: boolean = false,
  messageType:
    | "INBOX"
    | "TEMPLATE"
    | "CAMPAIGN"
    | "AUTOMATED"
    | "FLOW" = "INBOX",
  externalApi: boolean = false,
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
          (waMessageBody.send as WaSendMessageBody).template = template.data;
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
      userId,
      failed,
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
        externalApi: externalApi,
      });
    }

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
    const { orgId, userId } = request.user;
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
        await sendMessage(orgId, messageBody, null, userId);
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
