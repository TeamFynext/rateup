import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../utils/logger";
import { CustomerActionParamInput, LCustomerInput } from "./customer.schema";
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
    if (template)
      await sendTemplateToUserCore(orgId, template.waTemplateId, res.phone, []);
    await updateMonthlyStat(SubscriptionFeaturePathName.LoyaltyCustomer, orgId);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function customerActionHandler(
  request: FastifyRequest<{ Params: CustomerActionParamInput }>,
  reply: FastifyReply,
) {
  try {
    const { actionId, customerId } = request.params;
    const { customer, customerAction } = await handleLCustomerAction(
      customerId,
      actionId,
    );
    reply.code(200).send({
      message: "Success",
      totlaEarnedPoints: customer.totalEarnedPoints,
    });
    await sendTemplateToUserCore(
      customer.orgId,
      customerAction.action.waTemplateId,
      customer.phone,
      [],
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
