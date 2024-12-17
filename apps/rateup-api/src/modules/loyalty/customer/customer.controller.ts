import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../utils/logger";
import {
  AmountInput,
  CustomerActionParamInput,
  LCustomerInput,
} from "./customer.schema";
import {
  createLCustomer,
  deleteLoyaltyCustomer,
  getLoyaltyCustomers,
  handleLCustomerAction,
  verifyLCustomerMaxCountRestriction,
} from "./customer.service";
import { getLoyaltyTemplate } from "../settings/settings.service";
import {
  LoyaltyTemplateTypes,
  SubscriptionFeaturePathName,
} from "../../../types/enums";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller";
import { updateMonthlyStat } from "../../stats/stats.service";

export async function createLCustomerHandler(
  request: FastifyRequest<{ Body: LCustomerInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.body;
    const res = await createLCustomer(request.body);
    reply.code(200).send(res);
    const template = await getLoyaltyTemplate(
      LoyaltyTemplateTypes.CustomerRegistration,
      orgId,
    );
    if (template) {
      const dynamicVariables = [res.name];
      const components = [];
      components.push({
        type: "body",
        parameters: dynamicVariables.map((data: string) => ({
          type: "text",
          text: data,
        })),
      });
      await sendTemplateToUserCore(
        orgId,
        template.waTemplateId,
        res.phone,
        components,
      );
    }
    await updateMonthlyStat(SubscriptionFeaturePathName.LoyaltyCustomer, orgId);
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
    const { actionId, customerId } = request.params;
    const { amount } = request.body;
    const { success, data, message } = await handleLCustomerAction({
      customerId,
      actionId,
      amount,
    });
    if (!success) {
      return reply.code(403).send(message);
    }
    const { customer, customerAction, customerPoints } = data;
    reply.code(200).send({
      message: "Success",
      totlaEarnedPoints: customer.totalEarnedPoints,
    });
    const dynamicVariables = [customer.name, customerPoints?.toString()];
    const components = [];
    components.push({
      type: "body",
      parameters: dynamicVariables.map((data: string) => ({
        type: "text",
        text: data,
      })),
    });
    await sendTemplateToUserCore(
      customer.orgId,
      customerAction.action.waTemplateId,
      customer.phone,
      components,
    );
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyCustomersHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const customers = await getLoyaltyCustomers(request.user.orgId);
    reply.code(200).send(customers);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function verifyLCustomerMaxCountRestrictionHandler(
  request: FastifyRequest<{ Body: LCustomerInput }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.body.orgId;
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
    const customer = await deleteLoyaltyCustomer(request.params.id);
    reply.code(200).send(customer);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
