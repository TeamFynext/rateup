import { FastifyReply, FastifyRequest } from "fastify";
import { ByWaContactId, NewWaMessageBody } from "./wamessage.schema";
import {
  addNewWaMessage,
  getWaMessagesByWaContactId,
} from "./wamessage.service";
import { ContactCore } from "../../../contact/contact.schema";
import { waContactHandler } from "../contact/wacontact.controller";
import {
  getWaContactByContactId,
  getWaContactById,
} from "../contact/wacontact.service";
import { getContactByPhoneNumberAndOrgId } from "../../../contact/contact.service";
import { createTextMessage } from "../../whatsappSurvey/wasurvey.utils";
import { sendMessage } from "../../whatsappSurvey/wasurvey.service";
import {
  handleWaReceivedImages,
  returnAppropriateTimeStamp,
} from "./wamessage.utils";
import {
  fetchTemplate,
  getTemplateByNameAndOrgId,
} from "../../messageTemplates/wa_templates.service";

//this function automates the process of adding wa contacts and the associated messages to db
export async function handleWaMessages(
  type: "send" | "receive",
  messageBody: any,
  phone: string,
  orgId: string,
  userName?: string,
) {
  let waMessageBody: WaInboxMessageBody = {
    exchangeProcess: type,
    send: type === "send" ? messageBody : null,
    receive: type === "receive" ? messageBody : null,
  };
  let waContactId = "";
  switch (type) {
    case "send": {
      //condition to add template body to messageData if type is template
      if (messageBody?.type === "template") {
        const template = await getTemplateByNameAndOrgId(
          messageBody.template.name,
          orgId,
        );
        waMessageBody.send.template = template.data;
      }
      const contact = await getContactByPhoneNumberAndOrgId(phone, orgId);
      const waContact = await getWaContactByContactId(contact.id);
      waContactId = waContact.id;
    }
    case "receive": {
      const contactCore: ContactCore = {
        name: userName,
        phone: phone,
        source: "whatsapp",
      };
      waContactId = await waContactHandler(contactCore, orgId);
      waMessageBody = await handleWaReceivedImages(waMessageBody, orgId);
    }
  }
  const waTimeStamp = await returnAppropriateTimeStamp(waMessageBody);
  const waMessage = await addNewWaMessage(
    waMessageBody,
    waContactId,
    waTimeStamp,
  );
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
