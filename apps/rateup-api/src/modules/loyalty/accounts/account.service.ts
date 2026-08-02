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

/**
 * Resolves a referral code within a program, ignoring case.
 *
 * The lookup used to be an exact, case-sensitive match on a code the customer
 * types in by hand — and trackReferral minted codes that were not upper-cased
 * while signup minted codes that were, so a customer entering their own code in
 * caps was simply not found and the referrer earned nothing. See issues.txt 20.40.
 */
export async function findAccountByReferralCode(programId: string, referralCode: string) {
  return await prisma.customerLoyaltyAccount.findFirst({
    where: {
      programId,
      referralCode: { equals: referralCode, mode: "insensitive" },
    },
  });
}

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
  // The entry tier is the one with the LOWEST threshold — the tier a customer
  // holding nothing is already in — which is how resetProgramPoints picks it too.
  //
  // It used to be `where: { programId, priority: 1 }`, and createLoyaltyTier
  // numbers a program's first tier 0. So a single-tier program never matched, and
  // every new account was created with `currentTierId: null`, which then opened
  // the tier bypass in issues.txt 20.6. A program with two or more tiers enrolled
  // new customers into the SECOND tier created rather than the first.
  // See issues.txt 20.11.
  const tier = await prisma.loyaltyTier.findFirst({
    where: {
      programId: programId,
    },
    orderBy: {
      threshold: "asc",
    },
    select: {
      id: true,
    },
  });

  const signupBonus = program?.signupBonus || 0;

  const referralBonus = program?.referralBonus || 0;
  const referralBonusType = program?.referralBonusType || "points";
  const referralRewardId = program?.referralRewardId || null;

  const refereeBonus = program?.refereeBonus || 0;
  const refereeBonusType = program?.refereeBonusType || "points";
  const refereeRewardId = program?.refereeRewardId || null;

  // Points credited immediately at account creation
  const refereeBonusPoints = refereeBonusType === "points" ? refereeBonus : 0;

  const currentTierId = tier ? tier.id : null;
  let referredById = null;
  let referrerAccount: { id: string; currentPoints: number } | null = null;

  if (data.referCode) {
    const referredBy = await findAccountByReferralCode(programId, data.referCode);
    if (referredBy) {
      referredById = referredBy.id;
      referrerAccount = referredBy;

      // Award referral bonus to referrer (points path).
      //
      // balanceAfter comes from the UPDATE's returned row. It used to be computed
      // as `referredBy.currentPoints + referralBonus` from the row read moments
      // earlier, so any other write landing on that account in between — another
      // referral, a purchase, a redemption — left the ledger recording a balance
      // the account never held. balanceAfter is the column you replay to check a
      // balance is right; derived from a stale read it cannot do that job.
      // See issues.txt 20.15.
      if (referralBonusType === "points" && referralBonus > 0) {
        const updatedReferrer = await prisma.customerLoyaltyAccount.update({
          where: { id: referredBy.id },
          data: {
            currentPoints: { increment: referralBonus },
            lifetimePoints: { increment: referralBonus },
          },
        });
        await prisma.loyaltyTransaction.create({
          data: {
            accountId: referredBy.id,
            programId,
            transactionType: "earn",
            source: "referral",
            points: referralBonus,
            balanceAfter: updatedReferrer.currentPoints,
            metadata: { refereeContactId: contactId },
          },
        });
      }
      // Gift path is handled after the new account is created below
    }
  }

  // The signup bonus is credited HERE, in the opening balance, alongside the
  // referee bonus.
  //
  // It used to be left out of both currentPoints and lifetimePoints while the
  // block below still wrote a LoyaltyTransaction for it, dispatched a
  // POINTS_ISSUED notification for the same amount, and sent a "you are now
  // registered" message — so every customer signing up under a program with a
  // signup bonus was TOLD they had received it, saw it in their transaction
  // history, and had a balance of zero. The ledger and the balance disagreed from
  // the very first row, and support had nothing to reconcile against. The referee
  // bonus was credited correctly, which is what made this an omission rather than
  // a design. See issues.txt 20.14.
  const openingPoints = refereeBonusPoints + signupBonus;
  const account = await prisma.customerLoyaltyAccount.create({
    data: {
      programId,
      contactId: contactId,
      referralCode,
      currentPoints: openingPoints,
      lifetimePoints: openingPoints,
      referredById,
      currentTierId,
    },
    include: {
      contact: true,
    },
  });

  // Award referral gift to referrer (requires referrer account to exist — always true here)
  if (referrerAccount && referralBonusType === "gift" && referralRewardId) {
    try {
      await assignRewardToCustomer(referrerAccount.id, referralRewardId);
    } catch (e) {
      if (!(e as Error).message?.includes("already assigned")) throw e;
    }
  }

  // Award referee bonus (gift or points transaction)
  if (referredById) {
    if (refereeBonusType === "gift" && refereeRewardId) {
      await assignRewardToCustomer(account.id, refereeRewardId);
    } else if (refereeBonusPoints > 0) {
      // Record a transaction for the referee bonus points
      await prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          programId,
          transactionType: "earn",
          source: "referral",
          points: refereeBonusPoints,
          balanceAfter: openingPoints,
          metadata: { referrerAccountId: referredById },
        },
      });
    }
  }

  // Create transaction if signup bonus exists
  if (signupBonus > 0) {
    await prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        programId,
        transactionType: "earn",
        source: "signup_bonus",
        points: signupBonus,
        // The account's balance after this row, not the bonus in isolation — a
        // referee who also gets a signup bonus holds both.
        balanceAfter: openingPoints,
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

 Share & earn rewards:
        `,
      );
      await sendTextMessage({ phone, orgId }, null, joinLink);
    }

    // Dispatch Points Issued
    await dispatchLoyaltyNotification(orgId, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: phone,
      customerName: contact?.name || "Customer",
      points: signupBonus,
      balanceAfter: openingPoints,
      reason: "Signup Bonus",
      referralCode, // passing just in case
    });
  }

  return account;
}

export async function getCustomerAccounts(programId: string, search?: string, name?: string) {
  const contactFilter: Record<string, unknown> = {};
  if (name) {
    contactFilter.name = { contains: name, mode: "insensitive" };
  } else if (search) {
    contactFilter.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  return await prisma.customerLoyaltyAccount.findMany({
    where: {
      programId,
      ...(Object.keys(contactFilter).length > 0 ? { contact: contactFilter } : {}),
    },
    include: {
      currentTier: true,
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
      redemptions: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          reward: true,
        },
      },
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

/**
 * A customer account, within the caller's program.
 *
 * The program used to be absent entirely: this took the path id and handed it
 * straight to prisma, and getCustomerAccountByIdHandler never resolved the
 * caller's program either. An account id was therefore enough for a user of any
 * org to read another org's customer — points, tier, transaction history,
 * redemptions and referrals, all of which this function includes. Every other read
 * in the module resolves the program from the session first, which is what made
 * this one stand out. See issues.txt 20.18.
 */
export async function getCustomerAccountById(customerId: string, programId: string) {
  return await prisma.customerLoyaltyAccount.findFirst({
    where: { id: customerId, programId },
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

export async function getCustomerAccountByContact(programId: string, contactId: string) {
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
        include: {
          reward: true,
        },
      },
    },
  });
}

/**
 * Updates a customer account, within the caller's program.
 *
 * Same gap as getCustomerAccountById, with a write on the end of it: an account id
 * was enough to suspend or close another org's customer. The program is part of
 * the where clause, so prisma raises P2025 rather than updating a row the caller
 * cannot see. See issues.txt 20.18.
 */
export async function updateCustomerAccount(
  customerId: string,
  data: CustomerLoyaltyAccountUpdateInput,
  programId: string,
) {
  return await prisma.customerLoyaltyAccount.update({
    where: { id: customerId, programId },
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

  // Pricing the purchase, moving the balance, writing the ledger row and counting
  // the rule's use are ONE transaction.
  //
  // They used to be four independent writes with nothing around them, and the
  // engine's usage counter was incremented before any of the others. A failure
  // between the balance write and the ledger write left points credited with no
  // entry explaining them, which is precisely the state that makes a loyalty
  // ledger unauditable — and a failure after the counter left a promotion's
  // remaining uses spent on a purchase that never earned anything.
  // The approvals sub-module has always done this correctly; it is the model
  // copied here. See issues.txt 20.17.
  const { points, updatedCustomer, transaction } = await prisma.$transaction(async (tx) => {
    const calculated = await calculatePointsForPurchase(
      programId,
      customer.id,
      purchaseAmount,
      {
        purchase_amount: purchaseAmount,
        location_id: context.locationId,
        categories: context.productCategories,
        product_skus: context.productSkus,
        payment_method: context.paymentMethod,
        channel:
          context.channel === "online" ||
          context.channel === "in_store" ||
          context.channel === "mobile_app"
            ? context.channel
            : undefined,
        orderId: context.orderId,
        notes: context.notes,
      },
      tx,
    );

    // Update customer points and total spend
    const account = await tx.customerLoyaltyAccount.update({
      where: { id: customer.id },
      data: {
        currentPoints: {
          increment: calculated.points,
        },
        lifetimePoints: {
          increment: calculated.points,
        },
        totalSpend: {
          increment: purchaseAmount,
        },
      },
    });

    // Create transaction
    const ledgerRow = await tx.loyaltyTransaction.create({
      data: {
        accountId: customer.id,
        programId,
        transactionType: "earn",
        source: "purchase",
        points: calculated.points,
        balanceAfter: account.currentPoints,
        metadata: {
          purchaseAmount,
          orderId: context.orderId,
          appliedRuleId: calculated.rule?.id,
          appliedRuleName: calculated.rule?.name,
          ...context,
        },
      },
    });

    return {
      points: calculated.points,
      updatedCustomer: account,
      transaction: ledgerRow,
    };
  });

  // Check for tier upgrade
  const upgradeResult = await checkAndUpgradeTier(customer.id, Number(updatedCustomer.totalSpend));

  // Dispatch Notifications
  if (customer.contact?.phone && customer.contact?.orgId) {
    // Points Issued
    await dispatchLoyaltyNotification(customer.contact.orgId, LoyaltyEventType.POINTS_ISSUED, {
      customerPhone: customer.contact.phone,
      customerName: customer.contact.name || "Customer",
      points,
      balanceAfter: updatedCustomer.currentPoints,
      reason: "Purchase",
    });

    // Tier Upgraded
    if (upgradeResult?.upgraded) {
      await dispatchLoyaltyNotification(customer.contact.orgId, LoyaltyEventType.TIER_UPGRADED, {
        customerPhone: customer.contact.phone,
        customerName: customer.contact.name || "Customer",
        newTier: upgradeResult.newTier?.name || "New Tier",
        oldTier: customer.currentTier?.name || undefined, // We only have ID here, ideal would be name
        lifetimePoints: updatedCustomer.lifetimePoints,
      });
    }
  }

  return {
    customer: updatedCustomer,
    transaction,
    pointsAwarded: points,
  };
}

export async function getLCustomerByPhone(phone: string, orgId: string) {
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
  _notes?: string,
) {
  // Check if customer exists
  const customer = await prisma.customerLoyaltyAccount.findUnique({
    where: { id: customerId },
    include: { contact: true },
  });

  if (!customer) {
    throw new Error("Customer account not found");
  }

  // The reward is looked up WITHIN the customer's program. Both used to be fetched
  // independently by id and their programs never compared, so a reward id and an
  // account id from different programs were enough to assign a reward across the
  // tenant boundary. See issues.txt 20.18.
  const reward = await prisma.loyaltyReward.findFirst({
    where: { id: rewardId, programId: customer.programId },
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
    await dispatchLoyaltyNotification(customer.contact.orgId, LoyaltyEventType.REWARD_ISSUED, {
      customerPhone: customer.contact.phone,
      customerName: customer.contact.name || "Customer",
      rewardName: reward.name,
      redemptionCode: shortCode,
      rewardId: reward.id,
      rewardWaTemplateId: reward.waTemplateId,
    });
  }

  return assignment;
}

/**
 * Resolves a reward assignment by its short code, within an org.
 *
 * `orgId` is REQUIRED. It used to be optional, guarded with `if (orgId && …)`, so
 * any caller that simply omitted it skipped the ownership check altogether. The
 * two short-code handlers did pass the session org, so it was never exploited
 * through HTTP — it was a loaded footgun for the next caller, and the next caller
 * is the one who would not know to look. See issues.txt 20.18.
 */
export async function getRewardByShortCode(shortCode: string, orgId: string) {
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

  if (reward.account.program.orgId !== orgId) {
    throw new Error("Reward not found");
  }

  return reward;
}

export async function markRewardAsRedeemed(shortCode: string, orgId: string) {
  const reward = await getRewardByShortCode(shortCode, orgId);

  if (reward.status === "REDEEMED") {
    throw new Error("Reward is already redeemed");
  }

  // `status: { not: "REDEEMED" }` is part of the write's own condition, not only
  // of the read above it. Two cashiers scanning the same short code at the same
  // moment both used to pass the check and both mark it redeemed, so a reward
  // could be handed over twice. See issues.txt 20.17.
  try {
    return await prisma.customerReward.update({
      where: { id: reward.id, status: { not: "REDEEMED" } },
      data: {
        status: "REDEEMED",
      },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      throw new Error("Reward is already redeemed");
    }
    throw error;
  }
}
