import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../../../../utils/logger";
import { customerRedeemQueryInput } from "../../../loyalty.external.schema";
import {
  getLCustomerByPhone,
  handleSendTemplate,
  updateLCustomerRedeemPoint,
} from "../../../../../../loyalty/customer/customer.service";
import { getLoyaltyRewardByRewardId } from "../../../reward/internal-copy/rewards/reward.service";
import {
  createRedeem,
  RedeemStatus,
} from "../../../../../../loyalty/redeems/redeem.service";

export async function redeemPointsHandler(
  request: FastifyRequest<{ Querystring: customerRedeemQueryInput }>,
  reply: FastifyReply,
) {
  try {
    const { phone, reward_id } = request.query;
    const { orgId } = request.user;
    const [customer, reward] = await Promise.all([
      getLCustomerByPhone(phone, orgId),
      getLoyaltyRewardByRewardId(reward_id, orgId),
    ]);
    if (!customer) {
      log.trace("customer  with phone %s not found", phone);
      return reply.code(404).send("Customer not found");
    }
    if (!reward) {
      log.trace("reward with  with reward id %s not found", reward_id);
      return reply.code(404).send("Reward not found");
    }
    const { redeem, message } = await createRedeem(customer.id, reward.id);
    if (redeem.status === RedeemStatus.ISSUED) {
      const updatedCustomer = await updateLCustomerRedeemPoint(
        customer.id,
        redeem.reward.points,
      );
      reply.code(200).send({
        message: "Success",
        totalRedeemedPoints: updatedCustomer.redeemedPoints,
        code: redeem.code,
      });
      await handleSendTemplate(reward.waTemplateId, orgId, phone, [
        customer.Contact.name,
        reward.points?.toString(),
      ]);
    } else {
      reply.code(403).send(message);
    }
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
