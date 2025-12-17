import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../../../../../utils/logger.js";
import {
  getLCustomerByPhone,
  handleLCustomerAction,
  handleSendTemplate,
  updateLCustomer,
} from "../../../../../../loyalty/customer/customer.service.js";
import { getLoyaltyActionByActionId } from "../../../action/internal-copy/actions/actions.service.js";
import { CustomerActionQueryInput } from "../../../loyalty.external.schema.js";
import { AmountInput } from "../../../../../../loyalty/customer/customer.schema.js";

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
    if (!customer) {
      log.trace("Customer not found with phone Number: %s", phone);
      return reply
        .code(404)
        .send("Customer not found with phone Number: " + phone);
    }
    if (!customer.active) await updateLCustomer(phone, orgId, { active: true });

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
