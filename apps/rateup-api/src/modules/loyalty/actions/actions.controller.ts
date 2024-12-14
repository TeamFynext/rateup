import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLoyaltyAction,
  deleteLoyaltyActionById,
  getLoyaltyActionById,
  getLoyaltyActions,
  updateLoyaltyActionById,
} from "./actions.service";
import { log } from "../../../utils/logger";
import {
  ByReferralCodeParamInput,
  lActionIdParamInput,
  lActionUpdateInput,
  loyaltyActionInput,
} from "./actions.schema";
import prisma from "../../../utils/prisma";
import { SubscriptionFeaturePathName } from "../../../types/enums";
import { getNestedProperty } from "../../../utils/misc/obj.utils";
import { updateMonthlyStat } from "../../stats/stats.service";
import {
  getLoyaltyCustomerOrActionByReferralCode,
  handleLCustomerAction,
} from "../customer/customer.service";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller";

export async function createLoyaltyActionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await createLoyaltyAction(request.body, request.user.orgId);
    reply.code(200).send(res);
    await updateMonthlyStat(
      SubscriptionFeaturePathName.LoyaltyAction,
      request.user.orgId,
    );
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyActionsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await getLoyaltyActions(orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyActionByIdHandler(
  request: FastifyRequest<{
    Params: lActionIdParamInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await getLoyaltyActionById(request.params.actionId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateLoyaltyActionByIdHandler(
  request: FastifyRequest<{
    Params: lActionIdParamInput;
    Body: lActionUpdateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await updateLoyaltyActionById(
      request.params.actionId,
      request.body,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteLoyaltyActionByIdHandler(
  request: FastifyRequest<{
    Params: lActionIdParamInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await deleteLoyaltyActionById(request.params.actionId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function verifyLActionMaxCountRestriction(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user.orgId;

    const count = await prisma.loyaltyAction.count({
      where: {
        orgId,
      },
    });

    if (
      count >=
      getNestedProperty(
        request.subscription.features,
        SubscriptionFeaturePathName.LoyaltyAction,
      ).count.max
    ) {
      reply.code(403).send({
        message: "You have reached the maximum limit of loyalty actions",
        displayMessageInClient: true,
      });
    }
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function referActionHandler(
  request: FastifyRequest<{ Params: ByReferralCodeParamInput }>,
  reply: FastifyReply,
) {
  try {
    const { referralCode } = request.params;
    const { customerId, actionId } =
      await getLoyaltyCustomerOrActionByReferralCode(referralCode);
    const { customer, customerAction } = await handleLCustomerAction(
      customerId,
      actionId,
    );
    reply.code(200).send(customerAction);
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
