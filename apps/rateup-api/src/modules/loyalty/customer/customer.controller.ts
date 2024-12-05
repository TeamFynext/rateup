import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../utils/logger";
import { CustomerActionParamInput, LCustomerInput } from "./customer.schema";
import {
  createCustomerAction,
  createLCustomer,
  getLoyaltyCustomers,
  updateLCustomerPoint,
} from "./customer.service";
import { getLoyaltyTemplate } from "../settings/settings.service";
import { LoyaltyTemplateTypes } from "../../../types/enums";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller";

export async function createLCustomerHandler(
  request: FastifyRequest<{ Body: LCustomerInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.body;
    const res = await createLCustomer(request.body);
    const template = await getLoyaltyTemplate(
      LoyaltyTemplateTypes.CustomerRegistration,
      orgId,
    );
    reply.code(200).send(res);
    await sendTemplateToUserCore(
      orgId,
      template.waTemplateId,
      res.phone,
      [],
      template.teamId,
    );
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
    const customerAction = await createCustomerAction(customerId, actionId);
    const customer = await updateLCustomerPoint(
      customerId,
      customerAction.action.points,
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
      customerAction.action.teamId,
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
