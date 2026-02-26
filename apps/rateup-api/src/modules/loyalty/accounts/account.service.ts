import prisma from "../../../utils/prisma.js";
import {
  CustomerLoyaltyAccountInput,
  CustomerLoyaltyAccountUpdateInput,
} from "./account.schema.js";
import {
  calculatePointsForPurchase,
  checkAndUpgradeTier,
  generateReferralCode,
} from "../earningRulesEngine.js";
import { generateRewardShortCode } from "../../../utils/misc/random.utils.js";
import { sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { parsePhoneforWa } from "../util.js";
import { dispatchLoyaltyNotification } from "../loyaltyWaDispatcher.js";
import { generateWhatsAppJoinLink } from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { LoyaltyEventType } from "../../../types/enums.js";

export async function createCustomerAccount(
  data: CustomerLoyaltyAccountInput,
  programId: string,
  orgId: string,
  sourceIdentifier?: string,
) {
  let contactId;
  let contact;
  const phone = data?.phone?.replaceAll("+", "");
  // Check if contact with this phone already exists
  const existingContact = await prisma.contact.findFirst({
    where: {
      phone,
      orgId,
    },
  });

  if (existingContact) {
    contactId = existingContact.id;
    contact = existingContact;
  } else {
    // Create new contact
    contact = await prisma.contact.create({
      data: {
        orgId,
        phone,
        name: data.name,
        email: data.email,
        source: "loyalty_program",
        dob: data.dob ? new Date(data.dob) : null,
      },
    });
    contactId = contact.id;
  }

  // Check if customer already exists
  const existing = await prisma.customerLoyaltyAccount.findUnique({
    where: {
      programId_contactId: {
        programId,
        contactId: contactId,
      },
    },
  });

  if (existing) {
    if (existing.status === "inactive") {
      // Reactivate the account
      const account = await prisma.customerLoyaltyAccount.update({
        where: {
          id: existing.id,
        },
        data: {
          status: "active",
        },
        include: {
          contact: true,
        },
      });
      if (account && sourceIdentifier) {
        await sendTextMessage(
          { phone, orgId },
          null,
          `🎉 Welcome back ${account.contact?.name || ""}!`,
        );
      }
      return account;
    } else {
      throw new Error("Customer account already exists");
    }
  }

  // Generate referral code
  const referralCode = await generateReferralCode(
    contact?.name || contact?.phone || "CUSTOMER",
    contact?.phone || contactId,
  );

  // Get program to check signup bonus
  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
  });
  const tier = await prisma.loyaltyTier.findFirst({
    where: {
      programId: programId,
      priority: 1,
    },
    select: {
      id: true,
    },
  });

  const signupBonus = program?.signupBonus || 0;
  const currentTierId = tier ? tier.id : null;
  let referredById = null;

  if (data.referCode) {
    const referredBy = await prisma.customerLoyaltyAccount.findUnique({
      where: {
        referralCode: data.referCode,
        programId,
      },
    });
    if (referredBy) {
      await prisma.customerLoyaltyAccount.update({
        where: {
          id: referredBy?.id,
        },
        data: {
          currentPoints: {
            increment: program?.referralBonus || 0,
          },
          lifetimePoints: {
            increment: program?.referralBonus || 0,
          },
        },
      });
      referredById = referredBy ? referredBy.id : null;
    }
  }

  // Create account
  const account = await prisma.customerLoyaltyAccount.create({
    data: {
      programId,
      contactId: contactId,
      referralCode,
      currentPoints: signupBonus,
      lifetimePoints: signupBonus,
      referredById,
      currentTierId,
    },
    include: {
      contact: true,
    },
  });

  // Create transaction if signup bonus exists
  if (signupBonus > 0) {
    await prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        programId,
        transactionType: "earn",
        source: "signup_bonus",
        points: signupBonus,
        balanceAfter: signupBonus,
      },
    });
    if (account && sourceIdentifier) {
      const joinLink = generateWhatsAppJoinLink({
        waNumber: sourceIdentifier,
        referralCode: account.referralCode,
        source: data.source,
      });
      await sendTextMessage(
        { phone, orgId },
        null,
        `🎉 Welcome ${account.contact?.name || ""}!

You are now registered in our Loyalty Program.

🔗 Your referral code: ${referralCode}

 Share & earn rewards: ${joinLink}
        `,
      );
    }

    // Dispatch Points Issued
    await dispatchLoyaltyNotification(orgId, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: phone,
      customerName: contact?.name || "Customer",
      points: signupBonus,
      balanceAfter: signupBonus,
      reason: "Signup Bonus",
      referralCode, // passing just in case
    });
  }

  return account;
}

export async function getCustomerAccounts(programId: string) {
  return await prisma.customerLoyaltyAccount.findMany({
    where: { programId },
    include: {
      currentTier: true,
      contact: true,
      assignedRewards: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerAccountsForExport(programId: string) {
  return await prisma.customerLoyaltyAccount.findMany({
    where: { programId },
    select: {
      contact: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
      currentTier: {
        select: {
          name: true,
        },
      },
      currentPoints: true,
      lifetimePoints: true,
      referralCode: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerAccountById(customerId: string) {
  return await prisma.customerLoyaltyAccount.findUnique({
    where: { id: customerId },
    include: {
      currentTier: true,
      transactions: {
        take: 20,
        orderBy: { createdAt: "desc" },
      },
      redemptions: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
      referrals: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getCustomerAccountByContact(
  programId: string,
  contactId: string,
) {
  return await prisma.customerLoyaltyAccount.findUnique({
    where: {
      programId_contactId: {
        programId,
        contactId,
      },
    },
    include: {
      contact: true,
      currentTier: true,
      transactions: {
        take: 20,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getCustomerAccountByPhone(
  programId: string,
  phoneNumber: string,
  orgId: string,
) {
  // First find the contact by phone number
  const contact = await prisma.contact.findFirst({
    where: {
      phone: phoneNumber,
      orgId,
    },
  });

  if (!contact) {
    return null;
  }

  // Then find the customer account
  return await prisma.customerLoyaltyAccount.findUnique({
    where: {
      programId_contactId: {
        programId,
        contactId: contact.id,
      },
    },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
      assignedRewards: {
        include: {
          reward: true,
        },
      },
      currentTier: true,
      transactions: {
        take: 20,
        orderBy: { createdAt: "desc" },
      },
      redemptions: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function updateCustomerAccount(
  customerId: string,
  data: CustomerLoyaltyAccountUpdateInput,
) {
  return await prisma.customerLoyaltyAccount.update({
    where: { id: customerId },
    data,
  });
}

export async function awardPoints(
  programId: string,
  contactId: string,
  purchaseAmount: number,
  context: {
    locationId?: string;
    productCategories?: string[];
    productSkus?: string[];
    paymentMethod?: string;
    channel?: string;
    orderId?: string;
    notes?: string;
  },
) {
  // Get customer
  let customer = await prisma.customerLoyaltyAccount.findUnique({
    where: {
      programId_contactId: {
        programId,
        contactId,
      },
    },
    include: {
      contact: true, // Need contact for phone number
      program: true, // Need orgId? OrgId is usually checking program ownership.
      currentTier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!customer) {
    throw new Error("Customer account not found. Create account first.");
  }

  // Calculate points using earning rules engine
  const { points, appliedRule } = await calculatePointsForPurchase(
    programId,
    customer.id,
    purchaseAmount,
    context,
  );

  // Update customer points
  const updatedCustomer = await prisma.customerLoyaltyAccount.update({
    where: { id: customer.id },
    data: {
      currentPoints: {
        increment: points,
      },
      lifetimePoints: {
        increment: points,
      },
    },
  });

  // Create transaction
  const transaction = await prisma.loyaltyTransaction.create({
    data: {
      accountId: customer.id,
      programId,
      transactionType: "earn",
      source: "purchase",
      points,
      balanceAfter: updatedCustomer.currentPoints,
      metadata: {
        purchaseAmount,
        orderId: context.orderId,
        appliedRuleId: appliedRule?.id,
        appliedRuleName: appliedRule?.name,
        ...context,
      },
    },
  });

  // Check for tier upgrade
  const upgradeResult = await checkAndUpgradeTier(
    customer.id,
    updatedCustomer.lifetimePoints,
  );

  // Dispatch Notifications
  if (customer.contact?.phone && customer.contact?.orgId) {
    // Points Issued
    await dispatchLoyaltyNotification(
      customer.contact.orgId,
      LoyaltyEventType.POINTS_ISSUED,
      {
        customerPhone: customer.contact.phone,
        customerName: customer.contact.name || "Customer",
        points,
        balanceAfter: updatedCustomer.currentPoints,
        reason: "Purchase",
      },
    );

    // Tier Upgraded
    if (upgradeResult?.upgraded) {
      await dispatchLoyaltyNotification(
        customer.contact.orgId,
        LoyaltyEventType.TIER_UPGRADED,
        {
          customerPhone: customer.contact.phone,
          customerName: customer.contact.name || "Customer",
          newTier: upgradeResult.newTier?.name || "New Tier",
          oldTier: customer.currentTier?.name || undefined, // We only have ID here, ideal would be name
          lifetimePoints: updatedCustomer.lifetimePoints,
        },
      );
    }
  }

  return {
    customer: updatedCustomer,
    transaction,
    pointsAwarded: points,
  };
}

export async function getLCustomerByPhone(phone, orgId) {
  return await prisma.customerLoyaltyAccount.findFirst({
    where: {
      contact: {
        phone: parsePhoneforWa(phone),
        orgId,
      },
    },
    include: {
      contact: {
        select: {
          name: true,
          phone: true,
          email: true,
          dob: true,
        },
      },
    },
  });
}

export async function assignRewardToCustomer(
  customerId: string,
  rewardId: string,
  notes?: string,
) {
  // Check if customer exists
  const customer = await prisma.customerLoyaltyAccount.findUnique({
    where: { id: customerId },
    include: { contact: true },
  });

  if (!customer) {
    throw new Error("Customer account not found");
  }

  // Check if reward exists
  const reward = await prisma.loyaltyReward.findUnique({
    where: { id: rewardId },
  });

  if (!reward) {
    throw new Error("Reward not found");
  }

  // Check if reward is already assigned
  const existing = await prisma.customerReward.findUnique({
    where: {
      rewardId_accountId: {
        rewardId,
        accountId: customerId,
      },
    },
  });

  if (existing) {
    throw new Error("Reward is already assigned to this customer");
  }

  let shortCode = generateRewardShortCode();
  let unique = false;
  while (!unique) {
    const exists = await prisma.customerReward.findUnique({
      where: { shortCode },
    });
    if (exists) {
      shortCode = generateRewardShortCode();
    } else {
      unique = true;
    }
  }

  // Assign reward
  const assignment = await prisma.customerReward.create({
    data: {
      rewardId,
      accountId: customerId,
      shortCode,
      status: "ISSUED",
    },
    include: {
      reward: true,
    },
  });

  // Dispatch Notification
  if (customer.contact?.phone && customer.contact?.orgId) {
    await dispatchLoyaltyNotification(
      customer.contact.orgId,
      LoyaltyEventType.REWARD_ISSUED,
      {
        customerPhone: customer.contact.phone,
        customerName: customer.contact.name || "Customer",
        rewardName: reward.name,
        redemptionCode: shortCode,
        rewardId: reward.id,
        rewardWaTemplateId: reward.waTemplateId,
      },
    );
  }

  return assignment;
}

export async function getRewardByShortCode(shortCode: string, orgId?: string) {
  const reward = await prisma.customerReward.findUnique({
    where: { shortCode },
    include: {
      account: {
        include: {
          program: true,
          contact: true,
        },
      },
      reward: true,
    },
  });

  if (!reward) {
    throw new Error("Reward not found");
  }

  if (orgId && reward.account.program.orgId !== orgId) {
    throw new Error("Reward not found");
  }

  return reward;
}

export async function markRewardAsRedeemed(shortCode: string, orgId?: string) {
  const reward = await getRewardByShortCode(shortCode, orgId);

  if (reward.status === "REDEEMED") {
    throw new Error("Reward is already redeemed");
  }

  const updated = await prisma.customerReward.update({
    where: { id: reward.id },
    data: {
      status: "REDEEMED",
    },
  });

  return updated;
}
