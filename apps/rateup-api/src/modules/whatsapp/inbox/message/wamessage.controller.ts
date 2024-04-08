import { FastifyReply, FastifyRequest } from "fastify";
import { ByWaContactId, NewWaMessageBody } from "./wamessage.schema";
import {
  addNewWaMessage,
  getWaMessagesByWaContactId,
} from "./wamessage.service";
import { ContactCore } from "../../../contact/contact.schema";
import { waContactHandler } from "../contact/wacontact.controller";
import {
  getWaContactById,
  updateWaContactUpdatedById,
} from "../contact/wacontact.service";
import { createTextMessage } from "../../whatsappSurvey/wasurvey.utils";
import { sendMessage } from "../../whatsappSurvey/wasurvey.service";
import {
  handleWaReceivedImages,
  returnAppropriateTimeStamp,
} from "./wamessage.utils";
import { getTemplateByNameAndOrgId } from "../../messageTemplates/wa_templates.service";
import { log } from "../../../../utils/logger";
import { handleSendWsMessage } from "./wamessage.ws.controller";

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
    // Handle the contact in either cases send or receive returns the merged format of contact and waContact
    let waContact = await waContactHandler(contactCore, orgId);
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
      waContact?.id,
      waTimeStamp,
      parameterData,
    );
    const updatedWaContact = await updateWaContactUpdatedById(
      waContact?.id,
      waTimeStamp,
    );
    // Update the waContact with the updated timestamp
    waContact = { ...waContact, updatedAt: updatedWaContact.updatedAt };
    // Send the message to the connected clients
    await handleSendWsMessage(orgId, {
      contact: waContact,
      message: waMessage,
    });
  } catch (error) {
    log.error("Error in handleWaMessages: ", error);
  }
}

export async function sendNewWaMessageHandler(
  request: FastifyRequest<{ Body: NewWaMessageBody; Params: ByWaContactId }>,
  reply: FastifyReply,
) {
  try {
    const { waContactId } = request.params;
    const { type } = request.body;
    const { orgId } = request.user;
    const waContact = await getWaContactById(waContactId);
    switch (type) {
      case "text": {
        const messageBody = createTextMessage(
          waContact?.phone,
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
export async function getWaMessagesByWaContactIdHandler(
  request: FastifyRequest<{ Params: ByWaContactId }>,
  reply: FastifyReply,
) {
  try {
    const { waContactId } = request.params;
    const messages = await getWaMessagesByWaContactId(waContactId);
    reply.send(messages);
  } catch (error) {
    reply.status(500).send("Internal Server Error");
  }
}
