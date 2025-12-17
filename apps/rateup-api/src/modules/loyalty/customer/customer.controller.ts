import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../utils/logger.js";
import {
  AmountInput,
  CustomerActionParamInput,
  CustomerIdInput,
  LCustomerInput,
} from "./customer.schema.js";
import {
  createLCustomer,
  deleteLoyaltyCustomer,
  getLCustomerById,
  getLCustomerByPhone,
  getLoyaltyCustomers,
  handleLCustomerAction,
  handlePostRegisterAction,
  handleSendTemplate,
  importCSVContacts,
  updateLCustomer,
  verifyLCustomerMaxCountRestriction,
} from "./customer.service.js";
import {
  LoyaltyTemplateTypes,
  WaAutomatedReplyResponseType,
} from "../../../types/enums.js";
import {
  getLoyaltyWaCommandByType,
  replacedContentByDynamicVariable,
} from "../settings/settings.service.js";
import { dataExtractFileMimeTypes } from "../../fileUpload/fileUpload.schema.js";
import { ContactCore, PaginationQuery } from "../../contact/contact.schema.js";
import { ContactGroupType } from "../../../../generated/prisma/client.js";
import { sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";

export async function createLCustomerHandler(
  request: FastifyRequest<{ Body: LCustomerInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.body;
    const res = await createLCustomer(request.body);
    reply.code(200).send(res);
    const loyaltyWaCommand = await getLoyaltyWaCommandByType(
      LoyaltyTemplateTypes.CustomerRegistration,
      orgId,
    );
    if (loyaltyWaCommand) {
      const { responseType, waTemplateId, content } = loyaltyWaCommand;
      const dynamicVariables = [res.name];
      if (responseType === WaAutomatedReplyResponseType.Template)
        await handleSendTemplate(
          waTemplateId,
          orgId,
          res.phone,
          dynamicVariables,
        );
      else if (responseType === WaAutomatedReplyResponseType.Text) {
        const message = replacedContentByDynamicVariable(
          content,
          dynamicVariables,
        );
        await sendTextMessage({ phone: res.phone, orgId }, null, message);
      }
    }
    await handlePostRegisterAction(orgId, res.id);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function customerActionHandler(
  request: FastifyRequest<{
    Params: CustomerActionParamInput;
    Body: AmountInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { actionId, phone } = request.params;
    const { amount } = request.body;
    const customer = await getLCustomerByPhone(phone, orgId);
    if (!customer) {
      log.trace("Customer not found with phone Number: %s", phone);
      return reply
        .code(404)
        .send("Customer not found with phone Number: " + phone);
    }
    if (!customer.active) await updateLCustomer(phone, orgId, { active: true });
    const { success, data, message } = await handleLCustomerAction({
      customerId: customer.id,
      actionId,
      amount,
    });
    if (!success) {
      return reply.code(403).send(message);
    }
    const { customer: newCustomer, customerAction, customerPoints } = data;
    reply.code(200).send({
      message: "Success",
      totlaEarnedPoints: newCustomer.totalEarnedPoints,
    });
    await handleSendTemplate(
      customerAction.action.waTemplateId,
      customer.orgId,
      customer.Contact.phone,
      [
        customer.Contact.name,
        customerAction.action.rewardId
          ? customerAction.action.reward.name
          : customerPoints?.toString(),
      ],
    );
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyCustomersHandler(
  request: FastifyRequest<{
    Params: PaginationQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const customers = await getLoyaltyCustomers(
      request.user.orgId,
      request.query,
    );
    reply.code(200).send(customers);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function verifyLCustomerMaxCountRestrictionHandler(
  request: FastifyRequest<{ Body: { orgId?: string } & ContactCore }>,
  reply: FastifyReply,
) {
  try {
    if (request.body.source !== ContactGroupType.LOYALTY) return;
    const orgId = request.body.orgId ?? request.user.orgId;
    if (
      !(await verifyLCustomerMaxCountRestriction(orgId, request.subscription))
    ) {
      return reply.code(403).send({
        message: "Registration limit reached",
        displayMessageInClient: true,
      });
    }
  } catch (e) {
    log.error(e);
    return reply.code(500).send(e);
  }
}

export async function deleteLoyaltyCustomersHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const customer = await deleteLoyaltyCustomer(
      request.params.id,
      request.user.orgId,
    );
    reply.code(200).send(customer);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function importCSVContactsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const file = await request.file();
    const orgId = request.user.orgId;
    if (!dataExtractFileMimeTypes.includes(file?.mimetype))
      return reply
        .code(400)
        .send({ error: "This file type is not permitted." });
    const tags = [];
    let update = false;
    for (const key in file?.fields) {
      if (key.startsWith("tags[")) {
        tags.push(file?.fields?.[key]?.["value"]);
      } else if (key === "update") {
        update = file?.fields?.[key]?.["value"] === "true";
      }
    }
    const res: any = await importCSVContacts(file, orgId, tags, update);
    if (res.status === "error") {
      return reply.code(400).send({ error: "VALIDATION_ERR", data: res.data });
    }
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e?.message || "Something went wrong" });
  }
}

export async function getLCustomerByIdHanlder(
  request: FastifyRequest<{ Params: CustomerIdInput }>,
  reply: FastifyReply,
) {
  try {
    const customer = await getLCustomerById(request.params.customerId);
    reply.code(200).send(customer);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
