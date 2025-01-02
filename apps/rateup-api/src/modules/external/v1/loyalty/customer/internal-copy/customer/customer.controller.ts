import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../../../../../utils/logger";
import {
  getLCustomerByPhone,
  handleLCustomerAction,
  handleSendTemplate,
} from "../../../../../../loyalty/customer/customer.service";
import { getLoyaltyActionByActionId } from "../../../action/internal-copy/actions/actions.service";
import { CustomerActionQueryInput } from "../../../loyalty.external.schema";
import { AmountInput } from "../../../../../../loyalty/customer/customer.schema";

export async function customerActionHandler(
  request: FastifyRequest<{
    Querystring: CustomerActionQueryInput;
    Body: AmountInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { action_id, phone } = request.query;
    const { orgId } = request.user;
    const { amount } = request.body;
    let [customer, action] = await Promise.all([
      getLCustomerByPhone(phone, orgId),
      getLoyaltyActionByActionId(action_id, orgId),
    ]);
    const { success, data, message } = await handleLCustomerAction({
      customerId: customer.id,
      actionId: action.id,
      amount,
    });
    if (!success) {
      return reply.code(403).send(message);
    }
    let { customerAction, customerPoints } = data;
    reply.code(200).send({
      message: "Success",
    });
    await handleSendTemplate(
      customerAction.action.waTemplateId,
      customer.orgId,
      customer.phone,
      [
        customer.name,
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
