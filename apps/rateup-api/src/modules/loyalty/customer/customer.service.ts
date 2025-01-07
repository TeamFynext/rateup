import dayjs from "dayjs";
import {
  LoyaltyTemplateTypes,
  SubscriptionFeaturePathName,
  WaAutomatedReplyResponseType,
} from "../../../types/enums";
import { verifySubscription } from "../../../utils/auth";
import { log } from "../../../utils/logger";
import { getNestedProperty } from "../../../utils/misc/obj.utils";
import { getUniqueRandomAlphaId } from "../../../utils/misc/random.utils";
import prisma from "../../../utils/prisma";
import { updateMonthlyStat } from "../../stats/stats.service";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller";
import { LoyaltyActionType } from "../actions/actions.schema";
import {
  getLoyaltyActionById,
  getLoyaltyActions,
  getReferralLoyaltyAction,
} from "../actions/actions.service";
import { createRedeem, RedeemStatus } from "../redeems/redeem.service";
import {
  getReferralCodeByActionAndCustomer,
  replacedContentByDynamicVariable,
  sendTextMessageAndUpdateStats,
} from "../settings/settings.service";
import { LCustomerInput } from "./customer.schema";
import { isLReferralAction, isPurchaseAction, parsePhoneforWa } from "../util";
import { LoyaltyAction } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function createLCustomer(input: LCustomerInput) {
  const customer = await prisma.loyaltyCustomer.create({
    data: {
      name: input.name,
      phone: parsePhoneforWa(input.phone),
      email: input.email,
      orgId: input.orgId,
    },
    include: {
      referralCodes: true,
    },
  });
  const action = await getReferralLoyaltyAction(input.orgId);
  if (action) await getReferralCodeByActionAndCustomer(action.id, customer.id);
  return customer;
}

export async function handlePostRegisterAction(orgId, customerId) {
  const actions = await getLoyaltyActions(orgId);
  const registerActions = actions.filter(
    (a) => a.type === LoyaltyActionType.CustomerRegistration,
  );
  if (!registerActions.length) return;
  for (const action of registerActions) {
    const { success, data, message } = await handleLCustomerAction({
      action,
      customerId,
      actionId: action.id,
    });
    if (success) {
      const { customerAction, customer, customerPoints } = data;
      await handleSendTemplate(
        customerAction.action.waTemplateId,
        orgId,
        customer.phone,
        [customer.name, customerPoints?.toString()],
      );
    }
  }
}

export async function createCustomerAction({
  customerId,
  actionId,
  refereePhone,
  amount,
}: {
  customerId: string;
  actionId: string;
  refereePhone?: string;
  amount?: number;
}) {
  return await prisma.loyaltyActionCustomerMap.create({
    data: {
      customerId,
      actionId,
      refereePhone: parsePhoneforWa(refereePhone),
      amount,
    },
    include: {
      action: {
        include: {
          reward: true,
          refereeReward: true,
        },
      },
      customer: true,
    },
  });
}

export async function updateLCustomerPoint(id, points) {
  return await prisma.loyaltyCustomer.update({
    where: {
      id,
    },
    data: {
      totalEarnedPoints: {
        increment: points,
      },
    },
  });
}

export async function updateLCustomerRedeemPoint(id, points) {
  return await prisma.loyaltyCustomer.update({
    where: {
      id,
    },
    data: {
      redeemedPoints: {
        increment: points,
      },
    },
  });
}

export async function getLCustomerById(id) {
  return await prisma.loyaltyCustomer.findUnique({
    where: {
      id,
    },
  });
}

export async function getLoyaltyCustomers(orgId) {
  const customers = await prisma.loyaltyCustomer.findMany({
    where: {
      orgId,
    },
    include: {
      redeems: {
        include: {
          reward: true,
        },
      },
      actions: {
        include: {
          action: true,
        },
      },
      referralCodes: true,
    },
  });
  return customers?.map((c) => {
    const actionObj = {};
    Object.values(LoyaltyActionType).map((a) => (actionObj[a] = []));
    const actions = c.actions.map((action) => {
      actionObj[action.action.type].push({
        ...action.action,
        createdAt: action.createdAt,
        amountSpent: action.amount,
      });
    });
    return {
      id: c.id,
      customerInfo: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        createdAt: c.createdAt,
      },
      ...actionObj,
      referralCodes: c.referralCodes.map((r) => r.referralCode),
      redeems: c.redeems.filter((r) => r.status === RedeemStatus.COMPLETED),
      totalPoints: c.totalEarnedPoints,
      balancePoints: c.totalEarnedPoints - c.redeemedPoints,
    };
  });
}

export async function deleteLoyaltyCustomer(id: string) {
  await prisma.loyaltyCustomer.delete({
    where: {
      id,
    },
  });
}

export async function handleLoyaltyRegister(phone, name, loyaltyWaCommand) {
  const { orgId, responseType, waTemplateId, content } = loyaltyWaCommand;
  try {
    //subscription and usage check
    const customer = await getLCustomerByPhone(phone, orgId);
    if (customer) {
      return await sendTextMessageAndUpdateStats(
        phone,
        orgId,
        null,
        "You are already a member of our loyalty program\n\nReply *Points* to know the current points details",
      );
    }
    const subscription = await verifySubscription(orgId, [
      SubscriptionFeaturePathName.LoyaltyCustomer,
    ]);
    const isAllowed = await verifyLCustomerMaxCountRestriction(
      orgId,
      subscription,
    );
    if (!isAllowed) {
      log.trace("max count reached/ subscription not found");
      return;
    }
    const res = await createLCustomer({
      phone,
      name,
      orgId,
    });
    const dynamicVariables = [res.name];
    if (responseType === WaAutomatedReplyResponseType.Template) {
      await handleSendTemplate(
        waTemplateId,
        orgId,
        res.phone,
        dynamicVariables,
      );
    } else if (responseType === WaAutomatedReplyResponseType.Text) {
      const message = replacedContentByDynamicVariable(
        content,
        dynamicVariables,
      );
      await sendTextMessageAndUpdateStats(phone, orgId, null, message);
    }
    await updateMonthlyStat(SubscriptionFeaturePathName.LoyaltyCustomer, orgId);
    await handlePostRegisterAction(orgId, res.id);
  } catch (e) {
    log.error(e);
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      await sendTextMessageAndUpdateStats(
        phone,
        orgId,
        null,
        "You are already a member of our loyalty program\n\n Reply *Points* to know the current points details",
      );
    }
  }
}

export async function verifyLCustomerMaxCountRestriction(orgId, subscription) {
  if (!subscription) {
    log.trace("Subscription not found");
    return false;
  }
  const count = await prisma.loyaltyCustomer.count({
    where: {
      orgId,
    },
  });

  if (
    count >=
    getNestedProperty(
      subscription?.features as unknown as object,
      SubscriptionFeaturePathName.LoyaltyCustomer,
    ).count.max
  ) {
    return false;
  }
  return true;
}

export async function updateLCustomer(phone, orgId, data) {
  return await prisma.loyaltyCustomer.update({
    where: {
      loyalty_phone_org_id_unique: {
        phone: parsePhoneforWa(phone),
        orgId,
      },
    },
    data,
  });
}

export async function getLCustomerByPhone(phone, orgId) {
  return await prisma.loyaltyCustomer.findUnique({
    where: {
      loyalty_phone_org_id_unique: {
        phone: parsePhoneforWa(phone),
        orgId,
      },
    },
    include: {
      referralCodes: true,
      org: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function getLCustomerReferralCodes(customerId) {
  return await prisma.loyaltyReferralCode.findMany({
    where: {
      customerId,
    },
  });
}

export async function createLoyaltyReferralCode(
  actionId: string,
  customerId: string,
  existingReferralCodes: string[],
) {
  const referralCode = getUniqueRandomAlphaId(8, existingReferralCodes);
  return await prisma.loyaltyReferralCode.create({
    data: {
      customerId,
      actionId,
      referralCode,
    },
  });
}

export async function getLoyaltyCustomerOrActionByReferralCode(referralCode) {
  return await prisma.loyaltyReferralCode.findUnique({
    where: {
      referralCode,
    },
  });
}

export async function handleLCustomerAction({
  action,
  customerId,
  actionId,
  refereePhone,
  refereeName,
  amount,
}: {
  action?: LoyaltyAction;
  customerId: string;
  actionId: string;
  refereePhone?: string;
  refereeName?: string;
  amount?: number;
}) {
  if (!action) action = await getLoyaltyActionById(actionId);
  if (
    dayjs().isBefore(dayjs(action.startDate)) ||
    dayjs().isAfter(dayjs(action.endDate))
  ) {
    return { success: false, message: "Action Not available on this date" };
  }
  //handling referee action
  let referee;
  let refereePoints = action.refereePoints;
  if (isLReferralAction(action.type) && refereePhone) {
    referee = await getLCustomerByPhone(refereePhone, action.orgId);
    if (referee && !action.isExistingUserReferralAllowed)
      return {
        success: false,
        message: "Existing Customers are not allowed to use referral",
      };
    if (
      (action.refereeRewardId && action.isAmountBasedForReferee && !amount) ||
      amount < action.amount
    ) {
      return {
        success: false,
        message: "Minimum " + action.amount + " required",
      };
    }
    if (!referee) {
      referee = await createLCustomer({
        phone: refereePhone,
        orgId: action.orgId,
        name: refereeName,
      });
    }
    const res = await getLCustomerActionByRefereePhone(
      customerId,
      actionId,
      refereePhone,
    );
    if (res) {
      return { success: false, message: "Already referred by this number" };
    }
    if (action.refereeRewardId) {
      const { redeem, message } = await createRedeem(
        referee.id,
        action.rewardId,
        true,
      );
      if (redeem.status === RedeemStatus.FAILED) {
        return {
          success: false,
          message,
        };
      }
    }
    const refereeAction = await createCustomerAction({
      customerId: referee.id,
      actionId,
      amount,
    });

    if (!action.refereeRewardId) {
      referee = await updateLCustomerPoint(referee.id, refereePoints);
      if (isPurchaseAction(action.type) && action.isAmountBasedForReferee) {
        const points = Math.round((action.points / action.amount) * amount);
        refereePoints =
          points > action.maxPointsForReferee
            ? action.maxPointsForReferee
            : points;
      }
    }
  }
  //handling referrer/customer action having reward
  if (action.rewardId) {
    if (action.isAmountBased && (!amount || amount < action.amount)) {
      return {
        success: false,
        message: "Minimum " + action.amount + " required",
      };
    }
    const { redeem, message } = await createRedeem(
      customerId,
      action.rewardId,
      true,
    );
    if (redeem.status === RedeemStatus.FAILED) {
      return {
        success: false,
        message,
      };
    }
    const customerAction = await createCustomerAction({
      customerId,
      actionId,
      refereePhone,
      amount,
    });
    return {
      success: true,
      data: {
        customer: customerAction.customer,
        customerAction,
        referee,
        refereePoints,
      },
    };
  }
  //handling referrer/customer action having points
  let customerPoints = action.points;
  if (isPurchaseAction(action.type) && action.isAmountBased) {
    const points = Math.round((action.points / action.amount) * amount);
    customerPoints = points > action?.maxPoints ? action.maxPoints : points;
  }
  const customerAction = await createCustomerAction({
    customerId,
    actionId,
    refereePhone,
    amount,
  });
  const customer = await updateLCustomerPoint(customerId, customerPoints);
  return {
    success: true,
    data: { customer, customerAction, referee, customerPoints, refereePoints },
  };
}

export async function getLCustomerActionByRefereePhone(
  customerId,
  actionId,
  refereePhone,
) {
  return await prisma.loyaltyActionCustomerMap.findFirst({
    where: {
      customerId,
      actionId,
      refereePhone: parsePhoneforWa(refereePhone),
    },
    include: {
      customer: true,
    },
  });
}

export async function handleSendTemplate(
  waTemplateId,
  orgId,
  phone,
  dynamicVariables,
) {
  if (!waTemplateId) {
    log.trace("No template Id found");
    return;
  }
  const components = [];
  components.push({
    type: "body",
    parameters: dynamicVariables.map((data: string) => ({
      type: "text",
      text: data,
    })),
  });
  await sendTemplateToUserCore(orgId, waTemplateId, phone, components);
}
