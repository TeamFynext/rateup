import { FastifyReply, FastifyRequest } from "fastify";
import { CustomerRewardInput } from "./redeem.schema";
import {
  createRedeem,
  getLoyaltyRedeems,
  RedeemStatus,
} from "./redeem.service";
import { updateLCustomerRedeemPoint } from "../customer/customer.service";
import { log } from "../../../utils/logger";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller";

export async function redeemPointsHandler(
  request: FastifyRequest<{ Params: CustomerRewardInput }>,
  reply: FastifyReply,
) {
  try {
    const { customerId, rewardId } = request.params;
    const redeem = await createRedeem(customerId, rewardId);
    if (redeem.status === RedeemStatus.COMPLETED) {
      const customer = await updateLCustomerRedeemPoint(
        customerId,
        redeem.reward.points,
      );
      reply.code(200).send({
        message: "Success",
        totalRedeemedPoints: customer.redeemedPoints,
      });
      await sendTemplateToUserCore(
        customer.orgId,
        redeem.reward.waTemplateId,
        customer.phone,
        [],
      );
    } else {
      reply.code(403).send({
        message:
          "Failed: Customer do not have enough points to redeem the reward",
      });
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
