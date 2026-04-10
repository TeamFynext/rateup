import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { assignRewardToCustomer } from "../accounts/account.service.js";

export async function trackReferral(
  programId: string,
  referralCode: string,
  refereeContactId: string,
) {
  // Find referrer by referral code
  const referrer = await prisma.customerLoyaltyAccount.findFirst({
    where: {
      programId,
      referralCode,
    },
  });

  if (!referrer) {
    throw new Error("Invalid referral code");
  }

  // Check if referee already exists
  const existingReferee = await prisma.customerLoyaltyAccount.findUnique({
    where: {
      programId_contactId: {
        programId,
        contactId: refereeContactId,
      },
    },
  });

  if (existingReferee) {
    throw new Error("Customer already has an account");
  }

  // Get contact info
  const contact = await prisma.contact.findUnique({
    where: { id: refereeContactId },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  // Get program for referral/referee bonus configuration
  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
  });

  const referralBonus = program?.referralBonus || 0;
  const referralBonusType = program?.referralBonusType || "points";
  const referralRewardId = program?.referralRewardId;

  const refereeBonus = program?.refereeBonus || 0;
  const refereeBonusType = program?.refereeBonusType || "points";
  const refereeRewardId = program?.refereeRewardId;

  // If referee bonus is points, credit them on account creation
  const refereeBonusPoints = refereeBonusType === "points" ? refereeBonus : 0;

  // Create referee account
  const refereeReferralCode = `${contact.name?.substring(0, 4) || contact.phone?.substring(0, 4) || "REF"}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const referee = await prisma.customerLoyaltyAccount.create({
    data: {
      programId,
      contactId: refereeContactId,
      referralCode: refereeReferralCode,
      currentPoints: refereeBonusPoints,
      lifetimePoints: refereeBonusPoints,
    },
  });

  // Create referral record
  const referral = await prisma.loyaltyReferral.create({
    data: {
      programId,
      referrerAccountId: referrer.id,
      refereeContactId,
      refereeAccountId: referee.id,
      status: "pending",
    },
  });

  // Award referral bonus to referrer
  if (referralBonusType === "gift" && referralRewardId) {
    // Assign gift reward; silently skip if already assigned (repeat referrals)
    try {
      await assignRewardToCustomer(referrer.id, referralRewardId);
    } catch (e) {
      if (!(e as Error).message?.includes("already assigned")) {
        log.error(
          { error: (e as Error).message },
          "Error assigning referral reward",
        );
      }
    }
  }
  if (referralBonus > 0) {
    await prisma.customerLoyaltyAccount.update({
      where: { id: referrer.id },
      data: {
        currentPoints: { increment: referralBonus },
        lifetimePoints: { increment: referralBonus },
      },
    });

    await prisma.loyaltyTransaction.create({
      data: {
        accountId: referrer.id,
        programId,
        transactionType: "earn",
        source: "referral",
        points: referralBonus,
        balanceAfter: referrer.currentPoints + referralBonus,
        metadata: {
          referralId: referral.id,
          refereeContactId,
        },
      },
    });
  }

  // Award referee bonus
  if (refereeBonusType === "gift" && refereeRewardId) {
    await assignRewardToCustomer(referee.id, refereeRewardId);
  } else if (refereeBonusPoints > 0) {
    // Points already credited on account creation; record the transaction
    await prisma.loyaltyTransaction.create({
      data: {
        accountId: referee.id,
        programId,
        transactionType: "earn",
        source: "referral",
        points: refereeBonusPoints,
        balanceAfter: refereeBonusPoints,
        metadata: {
          referralId: referral.id,
          referrerAccountId: referrer.id,
        },
      },
    });
  }

  return {
    referral,
    referrer,
    referee,
    bonusAwarded: referralBonus,
  };
}

export async function completeReferral(
  referralId: string,
  purchaseAmount: number,
) {
  const referral = await prisma.loyaltyReferral.findUnique({
    where: { id: referralId },
    include: {
      refereeAccount: true,
    },
  });

  if (!referral) {
    throw new Error("Referral not found");
  }

  if (referral.status !== "pending") {
    throw new Error("Referral is not pending");
  }

  // Mark as completed
  await prisma.loyaltyReferral.update({
    where: { id: referralId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });

  return referral;
}

export async function getReferralsByReferrer(referrerId: string) {
  return await prisma.loyaltyReferral.findMany({
    where: { referrerAccountId: referrerId },
    include: {
      refereeAccount: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReferralsByProgram(programId: string) {
  return await prisma.loyaltyReferral.findMany({
    where: { programId },
    include: {
      referrerAccount: true,
      refereeAccount: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
