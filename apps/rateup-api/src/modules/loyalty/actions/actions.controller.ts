import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLoyaltyAction,
  deleteLoyaltyActionById,
  getCustomerActions,
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
  getLoyaltyCustomers,
  handleLCustomerAction,
  handleSendTemplate,
} from "../customer/customer.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { isLReferralAction } from "../util";
import { getReferralCodeByActionAndCustomer } from "../settings/settings.service";

export async function createLoyaltyActionHandler(
  request: FastifyRequest<{ Body: loyaltyActionInput }>,
  reply: FastifyReply,
) {
  try {
    const res = await createLoyaltyAction(request.body, request.user.orgId);
    reply.code(200).send(res);
    await updateMonthlyStat(
      SubscriptionFeaturePathName.LoyaltyAction,
      request.user.orgId,
    );
    if (!isLReferralAction(res.type)) return;
    const customers = await getLoyaltyCustomers(request.user.orgId);
    for (const customer of customers)
      await getReferralCodeByActionAndCustomer(res.id, customer.id);
  } catch (e) {
    log.error(e);
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002")
      return reply.code(500).send("Customer already exist");
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
    const { actionId } = request.params;
    const customerActions = await getCustomerActions(actionId);
    if (customerActions.length)
      return reply
        .code(403)
        .send(
          "Cannot delete the action used by active customer. Deactivate action instead",
        );
    const res = await deleteLoyaltyActionById(actionId);
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
    const {
      refereePhone,
      refereeName,
      amount,
      issuePurchasePoints,
      actionIds,
    } = request.body;
    const { customerId, actionId } =
      await getLoyaltyCustomerOrActionByReferralCode(referralCode);
    //handling referee and referrer action
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
    const {
      customer,
      customerAction: { action },
      referee,
      customerPoints,
      refereePoints,
    } = data;

    reply.code(200).send(customer);
    //sending template to referee
    if (referee) {
      await handleSendTemplate(
        action.refereeWaTemplateId,
        referee.orgId,
        referee.phone,
        [
          referee.name,
          action.refereeRewardId
            ? action.refereeReward.name
            : refereePoints?.toString(),
        ],
      );
    }
    const dynamicVariables = [
      customer.Contact.name,
      action.rewardId ? action.reward.name : customerPoints?.toString(),
    ];
    if (referee) dynamicVariables.push(referee?.name, referee?.phone);
    //sending template to referrer
    await handleSendTemplate(
      action.waTemplateId,
      customer.orgId,
      customer.Contact.phone,
      dynamicVariables,
    );
    //performing other actions on referee if present
    if (issuePurchasePoints && actionIds.length) {
      for (const actionId of actionIds) {
        const { success, data, message } = await handleLCustomerAction({
          customerId: referee.id,
          actionId,
          amount,
        });
        const { customerAction, customerPoints: refereeNewPoints } = data;
        if (success) {
          await handleSendTemplate(
            customerAction.action.waTemplateId,
            referee.orgId,
            referee.phone,
            [
              referee.name,
              customerAction.action.rewardId
                ? customerAction.action.reward.name
                : refereeNewPoints?.toString(),
            ],
          );
        }
      }
    }
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
