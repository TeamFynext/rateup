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
import {
  LoyaltyTemplateTypes,
  SubscriptionFeaturePathName,
} from "../../../types/enums";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller";
import prisma from "../../../utils/prisma";
import { getNestedProperty } from "../../../utils/misc/obj.utils";
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

export async function verifyLCustomerMaxCountRestriction(
  request: FastifyRequest<{ Body: LCustomerInput }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.body.orgId;
    const count = await prisma.loyaltyCustomer.count({
      where: {
        orgId,
      },
    });

    const subscription = await prisma.subscription.findUnique({
      where: {
        orgId,
      },
    });

    if (
      count >=
      getNestedProperty(
        request.subscription.features,
        SubscriptionFeaturePathName.LoyaltyCustomer,
      ).count.max
    ) {
      reply.code(403).send({
        message: "Registration limit reached",
        displayMessageInClient: true,
      });
    }
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
