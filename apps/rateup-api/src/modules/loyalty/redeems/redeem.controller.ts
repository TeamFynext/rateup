import { FastifyReply, FastifyRequest } from "fastify";
import {
  CustomerRewardInput,
  RedeemIdParamInput,
  RedeemUpdateInput,
} from "./redeem.schema.js";
import {
  createRedeem,
  getLoyaltyRedeems,
  RedeemStatus,
  updateLoyaltyRedeem,
} from "./redeem.service.js";
import {
  getLCustomerByPhone,
  handleSendTemplate,
  updateLCustomer,
  updateLCustomerRedeemPoint,
} from "../customer/customer.service.js";
import { log } from "../../../utils/logger.js";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller.js";

export async function redeemPointsHandler(
  request: FastifyRequest<{ Params: CustomerRewardInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { phone, rewardId } = request.params;
    const customer = await getLCustomerByPhone(phone, orgId);
    if (!customer) {
      log.trace("Customer not found with phone Number: %s", phone);
      return reply
        .code(404)
        .send("Customer not found with phone Number: " + phone);
    }
    if (!customer.active) await updateLCustomer(phone, orgId, { active: true });
    const { redeem, message } = await createRedeem(customer.id, rewardId);
    if (redeem.status === RedeemStatus.ISSUED) {
      const newCustomer = await updateLCustomerRedeemPoint(
        customer.id,
        redeem.reward.points,
      );
      reply.code(200).send({
        message: "Success",
        totalRedeemedPoints: newCustomer.redeemedPoints,
        code: redeem.code,
      });
      await handleSendTemplate(
        redeem.reward.waTemplateId,
        customer.orgId,
        customer.Contact.phone,
        [customer.Contact.name, redeem.reward.points?.toString()],
      );
    } else {
      reply.code(403).send(message);
    }
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyRedeemsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const redeems = await getLoyaltyRedeems(request.user.orgId);
    reply.code(200).send(redeems);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateRedeemHandler(
  request: FastifyRequest<{
    Params: RedeemIdParamInput;
    Body: RedeemUpdateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { redeemId } = request.params;
    const redeem = await updateLoyaltyRedeem(redeemId, request.body);
    reply.code(200).send(redeem);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
