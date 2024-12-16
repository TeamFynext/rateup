import dayjs from "dayjs";
import {
  LoyaltyTemplateTypes,
  SubscriptionFeaturePathName,
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
} from "../actions/actions.service";
import { RedeemStatus } from "../redeems/redeem.service";
import { getLoyaltyTemplate } from "../settings/settings.service";
import { LCustomerInput } from "./customer.schema";
import { isLReferralAction } from "../util";

export async function createLCustomer(input: LCustomerInput) {
  return await prisma.loyaltyCustomer.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      orgId: input.orgId,
    },
    include: {
      referralCodes: true,
    },
  });
}

export async function createCustomerAction(
  customerId,
  actionId,
  refereePhone?,
) {
  return await prisma.loyaltyActionCustomerMap.create({
    data: {
      customerId,
      actionId,
      refereePhone,
    },
    include: {
      action: true,
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
    },
  });
  return customers?.map((c) => {
    const actionObj = {};
    Object.values(LoyaltyActionType).map((a) => (actionObj[a] = []));
    const actions = c.actions.map((action) => {
      actionObj[action.action.type].push({
        ...action.action,
        createdAt: action.createdAt,
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

export async function handleLoyaltyRegister(phone, name, orgId) {
  //subscription and usage check
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
  const template = await getLoyaltyTemplate(
    LoyaltyTemplateTypes.CustomerRegistration,
    orgId,
  );
  if (template)
    await sendTemplateToUserCore(orgId, template.waTemplateId, res.phone, []);
  await updateMonthlyStat(SubscriptionFeaturePathName.LoyaltyCustomer, orgId);
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
        phone,
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
        phone: phone[0] !== "+" ? `+${phone}` : phone,
        orgId,
      },
    },
    include: {
      referralCodes: true,
    },
  });
}

export async function getLoyaltyDetailsToCustomer(phone, orgId) {
  let customer = await getLCustomerByPhone(phone, orgId);
  const actions = (await getLoyaltyActions(customer.orgId)).filter((a) =>
    [
      LoyaltyActionType.ReferFriend,
      LoyaltyActionType.ReferralPurchase,
    ].includes(a.type as LoyaltyActionType),
  );
  const customerReferralCodes = customer.referralCodes;
  const referralCodeActions = customerReferralCodes.map((c) => c.actionId);
  let referralCodes = customerReferralCodes.map((c) => c.referralCode);
  for (const action of actions) {
    if (!referralCodeActions.includes(action.id)) {
      const res = await createLoyaltyReferralCode(
        action.id,
        customer.id,
        referralCodes,
      );
      referralCodes.push(res.referralCode);
    }
  }
  return { customer, referralCodes };
}

export async function handleCustomerInfoWaRequest(phone, orgId) {
  try {
    const { customer, referralCodes } = await getLoyaltyDetailsToCustomer(
      phone,
      orgId,
    );
    const template = await getLoyaltyTemplate(
      LoyaltyTemplateTypes.CustomerInfo,
      customer.orgId,
    );
    if (template) {
      const dynamicVariables = [
        customer.name,
        (customer.totalEarnedPoints - customer.redeemedPoints).toString(),
        referralCodes.join(","),
      ];
      let components = [];
      components.push({
        type: "body",
        parameters: dynamicVariables.map((data: string) => ({
          type: "text",
          text: data,
        })),
      });
      await sendTemplateToUserCore(
        customer.orgId,
        template.waTemplateId,
        phone,
        components,
      );
    }
  } catch (e) {
    log.error(e);
  }
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

export async function handleLCustomerAction(
  customerId,
  actionId,
  refereePhone?,
  refereeName?,
) {
  const action = await getLoyaltyActionById(actionId);
  if (
    dayjs().isBefore(dayjs(action.startDate)) ||
    dayjs().isAfter(dayjs(action.endDate))
  ) {
    return { success: false, message: "Action Not available on this date" };
  }
  let referee;
  if (isLReferralAction(action.type) && refereePhone) {
    referee = await getLCustomerByPhone(refereePhone, action.orgId);
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
    const refereeAction = await createCustomerAction(referee.id, actionId);
    referee = await updateLCustomerPoint(referee.id, action.refereePoints);
  }
  const customerAction = await createCustomerAction(
    customerId,
    actionId,
    refereePhone,
  );
  const customer = await updateLCustomerPoint(
    customerId,
    customerAction.action.points,
  );
  return { success: true, data: { customer, customerAction, referee } };
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
      refereePhone,
    },
    include: {
      customer: true,
    },
  });
}
