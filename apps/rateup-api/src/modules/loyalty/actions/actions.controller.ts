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
  ReferralInput,
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
  request: FastifyRequest<{
    Params: ByReferralCodeParamInput;
    Body: ReferralInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { referralCode } = request.params;
    const { refereePhone, refereeName, amount } = request.body;
    const { customerId, actionId } =
      await getLoyaltyCustomerOrActionByReferralCode(referralCode);
    const { success, data, message } = await handleLCustomerAction({
      customerId,
      actionId,
      refereePhone,
      refereeName,
      amount,
    });
    if (!success) {
      return reply.code(403).send(message);
    }
    const { customer, customerAction, referee, customerPoints, refereePoints } =
      data;

    reply.code(200).send(customerAction);

    if (referee && customerAction.action.refereeWaTemplateId) {
      const dynamicVariables = [referee.name, refereePoints?.toString()];
      const components = [];
      components.push({
        type: "body",
        parameters: dynamicVariables.map((data: string) => ({
          type: "text",
          text: data,
        })),
      });
      await sendTemplateToUserCore(
        referee.orgId,
        customerAction.action.refereeWaTemplateId,
        referee.phone,
        components,
      );
    }
    if (customerAction.action.waTemplateId) {
      const dynamicVariables = [customer.name, customerPoints?.toString()];
      const components = [];
      components.push({
        type: "body",
        parameters: dynamicVariables.map((data: string) => ({
          type: "text",
          text: data,
        })),
      });
      await sendTemplateToUserCore(
        customer.orgId,
        customerAction.action.waTemplateId,
        customer.phone,
        components,
      );
    }
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
