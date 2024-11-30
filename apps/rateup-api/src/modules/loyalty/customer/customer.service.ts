import prisma from "../../../utils/prisma";
import { LoyaltyActionType } from "../actions/actions.schema";
import { RedeemStatus } from "../redeems/redeem.service";
import { LCustomerInput } from "./customer.schema";

export async function createLCustomer(input: LCustomerInput) {
  return await prisma.loyaltyCustomer.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      orgId: input.orgId,
    },
  });
}

export async function createCustomerAction(customerId, actionId) {
  return await prisma.loyaltyActionCustomerMap.create({
    data: {
      customerId,
      actionId,
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
      actionObj[action.action.type].push(action.action);
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
