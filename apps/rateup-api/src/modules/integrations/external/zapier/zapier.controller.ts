import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger";
import {
  getIntegrationByName,
  updateIntegrationByName,
} from "../../integrations.service";
import {
  IntegratedApps,
  LoyaltyTemplateTypes,
  WaAutomatedReplyResponseType,
} from "../../../../types/enums";
import { ByOrgIdParams } from "../../../org/org.schema";
import bcrypt from "bcrypt";
import { Role } from "../../../org/org.services";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Prisma } from "../../../../../generated/prisma/client";
import { ContactCore } from "../../../contact/contact.schema";
import {
  createContact,
  updateContactLabelsByName,
} from "../../../contact/contact.service";
import { ContactGroupType } from "../../../contact/contactGroup/contactGroup.schema";
import {
  createLCustomer,
  handleSendTemplate,
  handlePostRegisterAction,
} from "../../../loyalty/customer/customer.service";
import {
  getLoyaltyWaCommandByType,
  replacedContentByDynamicVariable,
} from "../../../loyalty/settings/settings.service";
import { sendTextMessage } from "../../../whatsapp/whatsappSurvey/wasurvey.service";
import { getLabels } from "../../../label/label.service";
import { getSampleContacts, ZapierTriggers } from "./zapier.service";

export async function zapierAuthenticationHandler(
  request: FastifyRequest<{ Querystring: ByOrgIdParams }>,
  reply: FastifyReply,
) {
  try {
    console.log("secret", request.headers["X-Hook-Secret"]);
    const { orgId } = request.query;
    if (!orgId) {
      log.warn("No orgId found in request\n%s", request.url);
      reply.code(404).send({ message: "Not found" });
      return;
    }
    const authHeader = request.headers.authorization;
    if (!authHeader.startsWith("Bearer ")) {
      log.error("No bearer token found in headers\n%o", request.headers);
      reply.code(400).send({
        message: "Invalid request",
        error: "No bearer token found in headers",
      });
      return;
    }
    const apiKey = authHeader.split("Bearer ")[1];
    if (!apiKey) {
      log.error("No API Key found in headers\n%o", request.headers);
      reply.code(401).send({
        message: "Not authorized",
        error: "No API Key found in headers",
      });
      return;
    }

    const integration = (await getIntegrationByName(
      orgId,
      IntegratedApps.zapier,
    )) as unknown as ZapierIntegration;

    if (
      !integration ||
      !integration.active ||
      !integration.credential?.accessToken
    ) {
      log.error(
        "Active Zapier integration or access token not found for orgId => %s",
        orgId,
      );
      reply.code(401).send({
        message: "Not authorized",
        error:
          "Zapier integration or access token not found for the organization",
      });
      return;
    }

    const isValid = await bcrypt.compare(
      apiKey,
      integration.credential?.accessToken,
    );

    if (!isValid) {
      log.error("Invalid access token\n%o", request.headers);
      reply
        .code(401)
        .send({ message: "Not authorized", error: "Invalid access token" });
      return;
    }

    const user = { orgId, role: Role.SUPER_ADMIN };
    (request as any).user! = user;
    if (request.url.includes("/auth")) reply.code(200).send({ user: user });
  } catch (e) {
    log.error("Error checking session\n%o", e);
    reply.code(401).send({ message: "Not authorized" });
  }
}

export async function createContactHandler(
  request: FastifyRequest<{ Body: ContactCore; Querystring: ByOrgIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.query;

    if (!isValidPhoneNumber(`+${request.body.phone}`))
      return reply.code(400).send({ error: "Phone number is not valid" });
    if (request.body.source === ContactGroupType.LOYALTY) {
      const contact = await createLCustomer({
        ...request.body,
        orgId,
      });
      reply.code(201).send(contact);
      const loyaltyWaCommand = await getLoyaltyWaCommandByType(
        LoyaltyTemplateTypes.CustomerRegistration,
        orgId,
      );
      if (loyaltyWaCommand) {
        const { responseType, waTemplateId, content } = loyaltyWaCommand;
        const dynamicVariables = [contact.name];
        if (responseType === WaAutomatedReplyResponseType.Template)
          await handleSendTemplate(
            waTemplateId,
            orgId,
            contact.phone,
            dynamicVariables,
          );
        else if (responseType === WaAutomatedReplyResponseType.Text) {
          const message = replacedContentByDynamicVariable(
            content,
            dynamicVariables,
          );
          await sendTextMessage(
            {
              phone: contact.phone,
              orgId,
            },
            null,
            message,
          );
        }
      }
      await handlePostRegisterAction(orgId, contact.id);
    } else {
      const contact = await createContact({ ...request.body, orgId });
      reply.code(201).send({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
      });
    }
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.code(500).send({ error: "Contact already exist" });
      }
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function sendTextMessageHandler(
  request: FastifyRequest<{ Querystring: ByOrgIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.query;
    const { phone, message } = request.body as {
      phone: string;
      message: string;
    };
    await sendTextMessage({ phone, orgId }, null, message);
    reply.code(200).send({ success: true });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function subscribeTriggerHandler(
  request: FastifyRequest<{ Querystring: ByOrgIdParams }>,
  reply: FastifyReply,
) {
  try {
    log.info(
      "zapier trigger subscription received with body => %o",
      request.body,
    );
    const { orgId } = request.query;
    const { hookUrl, subscribed_field, zapId } = request.body as {
      hookUrl: string;
      subscribed_field: string;
      zapId;
    };
    const integration = (await getIntegrationByName(
      orgId,
      IntegratedApps.zapier,
    )) as unknown as ZapierIntegration;
    const triggerSubscriptions =
      integration.credential && integration.credential.triggerSubscriptions
        ? [...integration.credential.triggerSubscriptions]
        : [];
    const newTrigger = {
      hookUrl,
      subscribed_field: subscribed_field as ZapierTriggers,
      active: true,
      zapId,
    };
    const index = triggerSubscriptions.findIndex(
      (t) => t.hookUrl === hookUrl && t.subscribed_field === subscribed_field,
    );
    const hookReceivedAt = new Date().toISOString();
    if (index !== -1) {
      if (triggerSubscriptions[index].active) {
        return reply.code(201).send(newTrigger);
      } else {
        triggerSubscriptions[index] = {
          ...triggerSubscriptions[index],
          active: true,
          updatedAt: hookReceivedAt,
        };
      }
    } else {
      triggerSubscriptions.push({
        ...newTrigger,
        createdAt: hookReceivedAt,
        updatedAt: hookReceivedAt,
      });
    }

    const credential = {
      ...integration.credential,
      triggerSubscriptions,
    };
    await updateIntegrationByName(orgId, IntegratedApps.zapier, { credential });
    reply.code(201).send(newTrigger);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function unsubscribeTriggerHandler(
  request: FastifyRequest<{ Querystring: ByOrgIdParams }>,
  reply: FastifyReply,
) {
  try {
    log.info(
      "zapier trigger subscription removal received with body => %o",
      request.body,
    );
    const { orgId } = request.query;
    const integration = (await getIntegrationByName(
      orgId,
      IntegratedApps.zapier,
    )) as unknown as ZapierIntegration;
    const { hookUrl, subscribed_field } = request.body as {
      hookUrl: string;
      subscribed_field: string;
    };
    const triggers = integration.credential.triggerSubscriptions.filter(
      (t) => t.hookUrl !== hookUrl && t.subscribed_field !== subscribed_field,
    );
    const credential = {
      ...integration.credential,
      triggerSubscriptions: triggers,
    };
    await updateIntegrationByName(orgId, IntegratedApps.zapier, { credential });
    reply.code(200).send({ success: true });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function assignContactLabelsHandler(
  request: FastifyRequest<{ Querystring: ByOrgIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.query;
    const { labels, contactId } = request.body as {
      contactId: string;
      labels: string[];
    };
    await updateContactLabelsByName(labels, contactId, orgId);
    reply.code(200).send({ labels, contactId });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getSampleContactsHandler(
  request: FastifyRequest<{ Querystring: ByOrgIdParams }>,
  reply: FastifyReply,
) {
  try {
    const contacts = await getSampleContacts(request.query.orgId);
    reply.send(contacts);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}
