import { FastifyReply, FastifyRequest } from "fastify";
import {
  CustomerRewardInput,
  RedeemIdParamInput,
  RedeemUpdateInput,
} from "./redeem.schema";
import {
  createRedeem,
  getLoyaltyRedeems,
  RedeemStatus,
  updateLoyaltyRedeem,
} from "./redeem.service";
import {
  handleSendTemplate,
  updateLCustomerRedeemPoint,
} from "../customer/customer.service";
import { log } from "../../../utils/logger";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller";

export async function redeemPointsHandler(
  request: FastifyRequest<{ Params: CustomerRewardInput }>,
  reply: FastifyReply,
) {
  try {
    const { customerId, rewardId } = request.params;
    const { redeem, message } = await createRedeem(customerId, rewardId);
    if (redeem.status === RedeemStatus.ISSUED) {
      const customer = await updateLCustomerRedeemPoint(
        customerId,
        redeem.reward.points,
      );
      reply.code(200).send({
        message: "Success",
        totalRedeemedPoints: customer.redeemedPoints,
        code: redeem.code,
      });
      await handleSendTemplate(
        redeem.reward.waTemplateId,
        customer.orgId,
        customer.phone,
        [customer.name, redeem.reward.points?.toString()],
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
